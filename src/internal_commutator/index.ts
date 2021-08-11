import { EventEmitter } from 'events'
import { WSS_manager } from '../wss'
import {
  EXCEPTION_MESSAGES,
  NOTIFICATION_EVENT_TYPES,
  SUBSCRIPTIONS_TYPES
} from '../constants'
import { send_message_options } from '../wss/types'
import { waiting_room_participant_api } from '../features/waiting_room_participant'
import { CONFIGURATIONS } from '../config'
import { logger, Track } from '../logger'
import { doctor_waiting_room_api } from '../features/doctor_waiting_room'
import { send_notification_payload } from '../mq/types'
import { mq_manager } from '../mq'
import { clinic_position_api } from '../features/clinic_position/api'
import { waiting_room_api } from '../features/waiting_room'
import { sysadmins_api } from '../features/sysadmins/api'
import { clinic_api } from '../features/clinics/api'

class commutator extends EventEmitter {
  private mq_interface?: mq_manager
  private local_wss?: WSS_manager
  private cached_messages: send_message_options[] = []
  private q_to_share_messages_id?: string

  constructor() {
    super()
    this.on(SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_JOINED, (options) =>
      this.on_participant_joined(options)
    )
    this.on(SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_LEFT, (options) =>
      this.on_participant_left(options)
    )
    this.on(SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_PICKED, (options) =>
      this.on_participant_picked(options)
    )
    this.on(SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_REFERRED, (options) =>
      this.on_participant_referred(options)
    )
    this.on(SUBSCRIPTIONS_TYPES.ON_PATIENT_RELEASED, (options) =>
      this.on_patient_released(options)
    )
    this.on(SUBSCRIPTIONS_TYPES.ON_NEW_CLINIC_ATTACHMENT, (options) =>
      this.on_new_clinic_attachment(options)
    )
    this.on(SUBSCRIPTIONS_TYPES.ON_CLINIC_ATTACHMENT_DECIDE, (options) =>
      this.on_decided_clinic_attachment(options)
    )
    this.on(SUBSCRIPTIONS_TYPES.ON_CLINIC_DECIDE, (options) =>
      this.on_decide_clinic(options)
    )
    this.on(SUBSCRIPTIONS_TYPES.ON_CALLBACK_SUCCESS, (options) =>
      this.on_patient_callback_request_success(options)
    )
    this.on(SUBSCRIPTIONS_TYPES.ON_FORCE_REMOVE, (options) =>
      this.on_force_remove_patient_from_wr(options)
    )
    this.on(SUBSCRIPTIONS_TYPES.ON_DOCTOR_ALREADY_IN_WR, (options) =>
      this.on_doctor_already_in_wr(options)
    )
    this.on(SUBSCRIPTIONS_TYPES.ON_NO_DOCTOR_IN_WR, (options) =>
      this.on_no_doctor_in_wr(options)
    )
    this.on(SUBSCRIPTIONS_TYPES.ON_REQUEST_STATUS_CHANGE, (options) => {
      this.on_request_status_changed(options)
    })
  }

  public register_wss(wss: WSS_manager) {
    this.local_wss = wss
    this.cached_messages.forEach((msg) => this.request_broadcast_message(msg))
    this.cached_messages = []
  }

  public apply_mq_interface(mq: mq_manager, q_id: string) {
    this.mq_interface = mq
    this.q_to_share_messages_id = q_id
  }

  public request_mq_message({
    user_id,
    title,
    body,
    data,
    apns,
    android
  }: send_notification_payload) {
    if (!this.mq_interface) return
    return this.mq_interface
      .init_send_notification_task({
        user_id,
        title,
        body,
        data,
        apns,
        android
      })
      .catch((err) => {
        logger.error('Failed to request_mq_message')
        logger.error(err)
      })
  }

  private cache_message(message: send_message_options) {
    this.cached_messages.push(message)
  }

  private request_broadcast_message(message: send_message_options) {
    if (!this.local_wss) {
      logger.error(EXCEPTION_MESSAGES.ON_WSS_NOT_REGISTERED)
      this.cache_message(message)
      return
    }
    this.local_wss.send_broadcast_message(message)

    if (this.mq_interface && this.q_to_share_messages_id) {
      this.mq_interface.pub_broadcast_message_to_share(
        CONFIGURATIONS.QUEUE.SHARED_MESSAGES_EXCHANGE_NAME,
        {
          user_to_notify: message.user_to_notify,
          message: message.payload,
          send_by: this.q_to_share_messages_id
        }
      )
    }
  }

  private async on_participant_joined({
    user_id,
    room_id
  }: {
    room_id: number
    user_id: string
  }) {
    const room_participants =
      await waiting_room_participant_api.get_record_list({
        options: {
          filters: {
            room_id
          }
        }
      })

    const waiting_room_doctors = await doctor_waiting_room_api.get_records({
      options: {
        filters: {
          waiting_room_id: room_id
        }
      }
    })

    if (room_participants.length)
      room_participants.forEach(({ user_id: user_to_notify }) =>
        this.request_broadcast_message({
          user_to_notify,
          payload: {
            broadcast_message_type: SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_JOINED,
            message: {
              room_id,
              user_id
            }
          }
        })
      )

    if (waiting_room_doctors.length) {
      waiting_room_doctors.forEach(({ user_id: user_to_notify }) =>
        this.request_broadcast_message({
          user_to_notify,
          payload: {
            broadcast_message_type: SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_JOINED,
            message: {
              room_id,
              user_id
            }
          }
        })
      )
    } else {
      const [waiting_room_record] = await waiting_room_api.get_record_list({
        options: {
          filters: {
            id: room_id
          }
        }
      })

      if (!waiting_room_record) return

      const doctors_to_notify =
        await clinic_position_api.get_doctor_ids_by_specialization({
          options: {
            medical_specialization_id:
              waiting_room_record.medical_specializations_id,
            clinic_id: waiting_room_record.clinic_id
          }
        })

      if (Array.isArray(doctors_to_notify) && doctors_to_notify.length)
        doctors_to_notify.forEach((user_id) =>
          this.request_mq_message({
            user_id,
            title: `Appotek waiting rooms`,
            body: `patients are waiting for you in ${waiting_room_record.title} waiting room`,
            data: {
              event: NOTIFICATION_EVENT_TYPES.on_waiting_room_idle,
              room_id: room_id.toString()
            }
          })
        )
    }
  }

  private async on_participant_left({
    user_id,
    room_id
  }: {
    room_id: number
    user_id: string
  }) {
    const room_participants =
      await waiting_room_participant_api.get_record_list({
        options: {
          filters: {
            room_id
          }
        }
      })

    const waiting_room_doctors = await doctor_waiting_room_api.get_records({
      options: {
        filters: {
          waiting_room_id: room_id
        }
      }
    })

    if (room_participants.length)
      room_participants.forEach(({ user_id: user_to_notify }) =>
        this.request_broadcast_message({
          user_to_notify,
          payload: {
            broadcast_message_type: SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_LEFT,
            message: {
              room_id,
              user_id
            }
          }
        })
      )

    if (waiting_room_doctors.length)
      waiting_room_doctors.forEach(({ user_id: user_to_notify }) =>
        this.request_broadcast_message({
          user_to_notify,
          payload: {
            broadcast_message_type: SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_LEFT,
            message: {
              room_id,
              user_id
            }
          }
        })
      )
  }

  private async on_participant_picked({
    room_id,
    user_id,
    target_id
  }: {
    room_id: number
    user_id: string
    target_id: string
  }) {
    const room_participants =
      await waiting_room_participant_api.get_record_list({
        options: {
          filters: {
            room_id
          }
        }
      })

    const waiting_room_doctors = await doctor_waiting_room_api.get_records({
      options: {
        filters: {
          waiting_room_id: room_id
        }
      }
    })

    if (room_participants.length)
      room_participants.forEach(({ user_id: user_to_notify }) =>
        this.request_broadcast_message({
          user_to_notify,
          payload: {
            broadcast_message_type: SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_PICKED,
            message: {
              room_id,
              user_id,
              target_id
            }
          }
        })
      )

    if (waiting_room_doctors)
      waiting_room_doctors.forEach(({ user_id: user_to_notify }) =>
        this.request_broadcast_message({
          user_to_notify,
          payload: {
            broadcast_message_type: SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_PICKED,
            message: {
              room_id,
              user_id,
              target_id
            }
          }
        })
      )

    const [participant_to_nofity] =
      await waiting_room_participant_api.get_record_list({
        options: {
          filters: {
            room_id,
            picked_by: null
          },
          limit: 1,
          offset: 2
        }
      })

    if (participant_to_nofity) {
      this.request_mq_message({
        user_id: participant_to_nofity.user_id,
        title: `Appotek waiting rooms`,
        body: `you are number 3 in queue`,
        data: {
          event: NOTIFICATION_EVENT_TYPES.ON_WAITING_ROOM_QUEUE_ALERT,
          room_id: room_id.toString()
        }
      })
    }
  }

  private async on_participant_referred({
    user_id,
    room_id,
    target_id,
    target_room_id
  }: {
    user_id: string
    room_id: number
    target_id: string
    target_room_id: number
  }) {
    const room_participants =
      await waiting_room_participant_api.get_record_list({
        options: {
          filters: {
            room_id
          }
        }
      })

    const waiting_room_doctors = await doctor_waiting_room_api.get_records({
      options: {
        filters: {
          waiting_room_id: room_id
        }
      }
    })

    if (room_participants.length)
      room_participants.forEach(({ user_id: user_to_notify }) =>
        this.request_broadcast_message({
          user_to_notify,
          payload: {
            broadcast_message_type: SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_LEFT,
            message: {
              room_id,
              user_id,
              target_id
            }
          }
        })
      )

    if (waiting_room_doctors)
      waiting_room_doctors.forEach(({ user_id: user_to_notify }) =>
        this.request_broadcast_message({
          user_to_notify,
          payload: {
            broadcast_message_type: SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_LEFT,
            message: {
              room_id,
              user_id,
              target_id
            }
          }
        })
      )

    const new_room_participants =
      await waiting_room_participant_api.get_record_list({
        options: {
          filters: {
            room_id: target_room_id
          }
        }
      })

    const new_waiting_room_doctors = await doctor_waiting_room_api.get_records({
      options: {
        filters: {
          waiting_room_id: target_room_id
        }
      }
    })

    if (new_room_participants.length)
      new_room_participants.forEach(({ user_id: user_to_notify }) =>
        this.request_broadcast_message({
          user_to_notify,
          payload: {
            broadcast_message_type: SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_JOINED,
            message: {
              room_id: target_room_id,
              user_id,
              target_id
            }
          }
        })
      )

    if (new_waiting_room_doctors.length)
      new_waiting_room_doctors.forEach(({ user_id: user_to_notify }) =>
        this.request_broadcast_message({
          user_to_notify,
          payload: {
            broadcast_message_type: SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_JOINED,
            message: {
              room_id: target_room_id,
              user_id,
              target_id
            }
          }
        })
      )
  }

  private async on_patient_released({
    user_id,
    room_id,
    target_id
  }: {
    user_id: string
    room_id: number
    target_id: string
  }) {
    const room_participants =
      await waiting_room_participant_api.get_record_list({
        options: {
          filters: {
            room_id
          }
        }
      })

    const waiting_room_doctors = await doctor_waiting_room_api.get_records({
      options: {
        filters: {
          waiting_room_id: room_id
        }
      }
    })

    if (room_participants.length)
      room_participants.forEach(({ user_id: user_to_notify }) =>
        this.request_broadcast_message({
          user_to_notify,
          payload: {
            broadcast_message_type: SUBSCRIPTIONS_TYPES.ON_PATIENT_RELEASED,
            message: {
              room_id,
              user_id,
              target_id
            }
          }
        })
      )

    if (waiting_room_doctors)
      waiting_room_doctors.forEach(({ user_id: user_to_notify }) =>
        this.request_broadcast_message({
          user_to_notify,
          payload: {
            broadcast_message_type: SUBSCRIPTIONS_TYPES.ON_PATIENT_RELEASED,
            message: {
              room_id,
              user_id,
              target_id
            }
          }
        })
      )
  }

  private async on_new_clinic_attachment({
    attachment_id,
    clinic_id
  }: {
    attachment_id: string
    clinic_id: string
  }) {
    const [sysadmins, clinic] = await Promise.all([
      sysadmins_api.get_sysadmins(),
      clinic_api.get_list({
        options: {
          filters: {
            id: clinic_id
          }
        }
      })
    ])

    if (!(Array.isArray(sysadmins) && sysadmins.length && clinic.length)) return
    const title = `Appotek clinic attachment`
    const body = `New attachment from the clinic "${clinic[0].name}" is pending approval`

    sysadmins.forEach((user) =>
      this.request_mq_message({
        user_id: user.id,
        title,
        body,
        data: {
          event: NOTIFICATION_EVENT_TYPES.ON_NEW_CLINIC_ATTACHMENT,
          attachment_id: attachment_id.toString(),
          clinic_id: clinic_id.toString()
        }
      })
    )
  }

  private async on_decided_clinic_attachment({
    attachment_id
  }: {
    attachment_id: string
  }) {
    const attachment = await clinic_api.get_attachments({
      options: {
        filters: {
          attachment_id
        }
      }
    })

    if (!(Array.isArray(attachment) && attachment.length)) return
    const title = `Appotek support`
    const body = `Appotek support made a decision about the clinic attachment that you added.`

    this.request_mq_message({
      user_id: attachment[0].created_by,
      title,
      body,
      data: {
        event: NOTIFICATION_EVENT_TYPES.ON_CLINIC_ATTACHMENT_DECIDE,
        attachment_id: attachment_id.toString()
      }
    })
  }

  private async on_decide_clinic({ clinic_id }: { clinic_id: string }) {
    const clinic_admins = await clinic_position_api.get_records({
      options: {
        filters: {
          clinic_id,
          is_admin: true
        }
      }
    })

    if (!(Array.isArray(clinic_admins) && clinic_admins.length)) return
    const title = `Appotek support`
    const body = `Appotek support has made a decision about clinic where you are the administrator.`

    clinic_admins.forEach((admin) =>
      this.request_mq_message({
        user_id: admin.user_id,
        title,
        body,
        data: {
          event: NOTIFICATION_EVENT_TYPES.ON_CLINIC_DECIDE,
          clinic_id: admin.clinic_id.toString()
        }
      })
    )
  }

  private async on_patient_callback_request_success({
    user_id
  }: {
    user_id: string
  }) {
    const title = `Appotek support`
    const body = `You are requested a callback, we can give you a callback in sometime(s)`
    this.request_mq_message({
      user_id,
      title,
      body,
      data: { event: NOTIFICATION_EVENT_TYPES.ON_PATIENT_CALLBACK_SUCCESS }
    })
  }

  private async on_force_remove_patient_from_wr({
    room_name,
    user_id
  }: {
    user_id: string
    room_name: string
  }) {
    const title = `Appotek support`
    const body = `You have been removed from room ${room_name}`
    this.request_mq_message({
      user_id,
      title,
      body,
      data: { event: NOTIFICATION_EVENT_TYPES.ON_FORCE_REMOVE_PATIENT }
    })
  }

  private async on_doctor_already_in_wr({ clinic_id }: any) {
    const clinic_admins = await clinic_position_api.get_records({
      options: {
        filters: {
          clinic_id,
          is_admin: true
        }
      }
    })

    if (!(Array.isArray(clinic_admins) && clinic_admins.length)) return
    const title = `Appotek support`
    const body = `Doctor is in another waiting room already. Please review as admin`

    clinic_admins.forEach((admin) =>
      this.request_mq_message({
        user_id: admin.user_id,
        title,
        body,
        data: {
          event: NOTIFICATION_EVENT_TYPES.ON_DOCTOR_ALREADY_IN_WR,
          clinic_id: admin.clinic_id.toString()
        }
      })
    )
  }

  private async on_no_doctor_in_wr({ user_id, room_id }: any) {
    const title = `Appotek support`
    const body = `No doctor is present in waiting room. Please check`
    this.request_mq_message({
      user_id,
      title,
      body,
      data: { event: NOTIFICATION_EVENT_TYPES.ON_NO_DOCTOR_IN_WR }
    })
  }

  public async on_request_status_changed({ room_id, staff_id, clinic_id }: any) {
    const title = `Appotek support`
    const body = `Status has been changed for your request. Please Check`
    this.request_mq_message({
      user_id: staff_id,
      title,
      body,
      data: { event: NOTIFICATION_EVENT_TYPES.ON_REQUEST_STATUS_CHANGE }
    })
  }
}

export const internal_commutator = new commutator()
