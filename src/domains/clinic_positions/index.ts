import { Validate } from '../../etc/helpers'
import {
  create_clinic_specialization_payload,
  rebase_clinic_specialization_payload,
  leave_clinic_payload,
  get_user_specializations_payload,
  get_clinic_professionals_payload,
  get_time_slots_payload,
  switch_active_clinic_payload,
  change_clinic_admin_payload,
  verify_clinic_member,
  change_department_payload,
  doctors_by_clinic_payload
} from './types'
import { clinic_position_api } from '../../features/clinic_position/api'
import { clinic_position_schedule_api } from '../../features/clinic_position_schedule/api'
import { spawnClient } from '../../db'
import { EXCEPTION_MESSAGES, REGULAR_EXPRESSIONS } from '../../constants'
import get_or_create_telephone_handler from '../../handlers/telephones/get_or_create'
import { clinic_department_api } from '../../features/clinic_department'
import { waiting_room_api } from '../../features/waiting_room'

export class clinic_position_domain {
  @Validate((args) => args[0], {
    user_id: 'uuid',
    clinic_id: 'uuid',
    medical_specialization_id: {
      type: 'number',
      optional: true
    },
    medical_level_id: {
      type: 'number',
      optional: true
    },
    certificate: {
      type: 'object',
      optional: true,
      props: {
        attachment_id: 'string',
        certificate_number: {
          type: 'string',
          optional: true
        }
      }
    },
    chat_allowed: {
      type: 'boolean',
      optional: true
    },
    audio_call_allowed: {
      type: 'boolean',
      optional: true
    },
    contact_directly_allowed: {
      type: 'boolean',
      optional: true
    },
    video_call_allowed: {
      type: 'boolean',
      optional: true
    },
    corporate_email: {
      type: 'string',
      optional: true,
      pattern: REGULAR_EXPRESSIONS.EMAIL
    },
    corporate_phone: {
      type: 'object',
      optional: true,
      props: {
        code: 'string',
        number: {
          type: 'number',
          convert: true
        }
      }
    },
    shifts: {
      type: 'array',
      optional: true,
      items: {
        type: 'object',
        props: {
          days: {
            type: 'array',
            items: 'number'
          },
          start: {
            type: 'string',
            pattern: REGULAR_EXPRESSIONS.TIME
          },
          finish: {
            type: 'string',
            pattern: REGULAR_EXPRESSIONS.TIME
          },
          consultation_slot: {
            type: 'object',
            optional: true,
            props: {
              from: {
                type: 'string',
                pattern: REGULAR_EXPRESSIONS.TIME
              },
              to: {
                type: 'string',
                pattern: REGULAR_EXPRESSIONS.TIME
              },
              time_slot: {
                type: 'number',
                min: 15,
                max: 60
              }
            }
          },
          home_visit_slot: {
            type: 'object',
            optional: true,
            props: {
              from: {
                type: 'string',
                pattern: REGULAR_EXPRESSIONS.TIME
              },
              to: {
                type: 'string',
                pattern: REGULAR_EXPRESSIONS.TIME
              },
              time_slot: {
                type: 'number',
                min: 15,
                max: 60
              }
            }
          },
          online_slot: {
            type: 'object',
            optional: true,
            props: {
              from: {
                type: 'string',
                pattern: REGULAR_EXPRESSIONS.TIME
              },
              to: {
                type: 'string',
                pattern: REGULAR_EXPRESSIONS.TIME
              },
              time_slot: {
                type: 'number',
                min: 15,
                max: 60
              }
            }
          },
          department_id: {
            type: 'number',
            optional: true
          }
        }
      }
    },
    sub_role_id: 'number'
  })
  static async add_clinic_position({
    user_id,
    clinic_id,
    medical_specialization_id,
    medical_level_id,
    shifts = [],
    video_call_allowed,
    contact_directly_allowed,
    audio_call_allowed,
    chat_allowed,
    corporate_email,
    corporate_phone,
    certificate,
    department_id,
    sub_role_id
  }: create_clinic_specialization_payload) {
    if (department_id) {
      const [report] = await clinic_department_api.get_record_list({
        options: {
          filters: {
            clinic_id,
            id: department_id
          }
        }
      })

      if (!report) {
        const ex = new Error(
          EXCEPTION_MESSAGES.ON_CLINIC_DEPARTMENT_DOES_NOT_BELONG_TO_CHOSEN_CLINIC
        )
        ex.statusCode = 412
        throw ex
      }
    } else {
      const clinic_departments = await clinic_department_api.get_record_list({
        options: {
          filters: {
            clinic_id
          },
          limit: 1
        }
      })

      if (clinic_departments.length > 0) {
        const ex = new Error(EXCEPTION_MESSAGES.ON_CLINIC_DEPARTMENT_REQUIRED)
        ex.statusCode = 412
        throw ex
      }
    }

    const isolated_client = await spawnClient()
    let telephone_id
    try {
      await isolated_client.query('BEGIN')

      if (corporate_phone) {
        telephone_id = await get_or_create_telephone_handler({
          payload: corporate_phone,
          client: isolated_client
        })

        if (!telephone_id) {
          const ex = new Error(
            EXCEPTION_MESSAGES.ON_FAILED_PROCEED_MOBILE_NUMBER_EX
          )
          ex.statusCode = 400
          throw ex
        }
      }

      await clinic_position_api.create_record({
        options: {
          user_id,
          clinic_id,
          medical_specialization_id,
          medical_level_id,
          chat_allowed,
          audio_call_allowed,
          contact_directly_allowed,
          video_call_allowed,
          corporate_phone_id: telephone_id,
          corporate_email,
          certificate: (certificate && certificate.attachment_id) || null,
          certificate_number:
            (certificate && certificate.certificate_number) || null,
          department_id,
          sub_role_id
        },
        client: isolated_client
      })

      await Promise.all(
        shifts.map(
          (
            {
              days,
              start,
              finish,
              consultation_slot,
              home_visit_slot,
              online_slot
            },
            index
          ) =>
            Promise.all(
              days.map((day) =>
                clinic_position_schedule_api.create_record({
                  options: {
                    user_id,
                    clinic_id,
                    medical_specialization_id,
                    stack_id: index,
                    start: {
                      day,
                      hour: +start.slice(0, 2),
                      minute: +start.slice(3, 5)
                    },
                    finish: {
                      day,
                      hour: +finish.slice(0, 2),
                      minute: +finish.slice(3, 5)
                    },
                    ...(consultation_slot
                      ? {
                          consultation_slot_from: {
                            day,
                            hour: +consultation_slot.from.slice(0, 2),
                            minute: +consultation_slot.from.slice(3, 5)
                          },
                          consultation_slot_to: {
                            day,
                            hour: +consultation_slot.to.slice(0, 2),
                            minute: +consultation_slot.to.slice(3, 5)
                          },
                          consultation_slot_interval:
                            consultation_slot.time_slot,
                          consultation_payment_mode:
                            consultation_slot.payment_mode
                              ? consultation_slot.payment_mode
                              : 0,
                          consultation_price: consultation_slot.price
                            ? consultation_slot.price
                            : 0
                        }
                      : {}),
                    ...(home_visit_slot
                      ? {
                          home_visit_slot_from: {
                            day,
                            hour: +home_visit_slot.from.slice(0, 2),
                            minute: +home_visit_slot.from.slice(3, 5)
                          },
                          home_visit_slot_to: {
                            day,
                            hour: +home_visit_slot.to.slice(0, 2),
                            minute: +home_visit_slot.to.slice(3, 5)
                          },
                          home_visit_slot_interval: home_visit_slot.time_slot,
                          home_visit_payment_mode: home_visit_slot.payment_mode
                            ? home_visit_slot.payment_mode
                            : 0,
                          home_visit_price: home_visit_slot.price
                            ? home_visit_slot.price
                            : 0
                        }
                      : {}),
                    ...(online_slot
                      ? {
                          online_slot_from: {
                            day,
                            hour: +online_slot.from.slice(0, 2),
                            minute: +online_slot.from.slice(3, 5)
                          },
                          online_slot_to: {
                            day,
                            hour: +online_slot.to.slice(0, 2),
                            minute: +online_slot.to.slice(3, 5)
                          },
                          online_slot_interval: online_slot.time_slot,
                          online_slot_payment_mode: online_slot.payment_mode
                            ? online_slot.payment_mode
                            : 0,
                          online_slot_price: online_slot.price
                            ? online_slot.price
                            : 0
                        }
                      : {})
                  },
                  client: isolated_client
                })
              )
            )
        )
      )

      await isolated_client.query('COMMIT')

      return {
        success: true
      }
    } catch (err) {
      await isolated_client.query('ROLLBACK')
      err.statusCode = 400
      throw err
    } finally {
      await isolated_client.release()
    }
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    clinic_id: 'uuid',
    user_to_verify_id: 'uuid'
  })
  static async verify_clinic_member({
    user_to_verify_id,
    user_id,
    clinic_id
  }: verify_clinic_member) {
    const isolated_client = await spawnClient()

    try {
      await isolated_client.query('BEGIN')

      const [requester_clinic_position] = await clinic_position_api.get_records(
        {
          options: {
            filters: {
              clinic_id,
              user_id,
              is_admin: true
            }
          },
          client: isolated_client
        }
      )

      if (!requester_clinic_position) {
        const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_ADMIN_OF_THE_CLINIC_EX)
        ex.statusCode = 400
        throw ex
      }

      const [user_to_verify_clinic_position] =
        await clinic_position_api.get_records({
          options: {
            filters: {
              user_id: user_to_verify_id,
              clinic_id
            }
          }
        })

      if (!user_to_verify_clinic_position) {
        const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_CLINIC_MEMBER_EX)
        ex.statusCode = 400
        throw ex
      }

      await clinic_position_api.update_record({
        options: {
          filters: {
            user_id: user_to_verify_id,
            clinic_id
          },
          update_obj: {
            verified: true
          }
        },
        client: isolated_client
      })

      await isolated_client.query('COMMIT')

      return {
        success: true
      }
    } catch (err) {
      await isolated_client.query('ROLLBACK')
      err.statusCode = 400
      throw err
    } finally {
      isolated_client.release()
    }
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid',
    new_admin_id: 'uuid',
    user_id: 'uuid'
  })
  static async change_clinic_admin({
    user_id,
    clinic_id,
    new_admin_id
  }: change_clinic_admin_payload) {
    const isolated_client = await spawnClient()

    try {
      await isolated_client.query('BEGIN')

      const [requester_clinic_position] = await clinic_position_api.get_records(
        {
          options: {
            filters: {
              clinic_id,
              user_id,
              is_admin: true
            }
          },
          client: isolated_client
        }
      )

      if (!requester_clinic_position) {
        const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_ADMIN_OF_THE_CLINIC_EX)
        ex.statusCode = 400
        throw ex
      }

      const [new_admin_clinic_position] = await clinic_position_api.get_records(
        {
          options: {
            filters: {
              user_id: new_admin_id,
              clinic_id
            }
          }
        }
      )

      if (!new_admin_clinic_position) {
        const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_CLINIC_MEMBER_EX)
        ex.statusCode = 400
        throw ex
      }

      await clinic_position_api.update_record({
        options: {
          filters: {
            user_id,
            clinic_id
          },
          update_obj: {
            is_admin: false
          }
        },
        client: isolated_client
      })

      const { rows } = await clinic_position_api.update_record({
        options: {
          filters: {
            user_id: new_admin_id,
            clinic_id
          },
          update_obj: {
            is_active: true
          }
        },
        client: isolated_client
      })

      if (!rows.length) {
        const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_CLINIC_MEMBER_EX)
        ex.statusCode = 400
        throw ex
      }

      await isolated_client.query('COMMIT')

      return {
        success: true
      }
    } catch (err) {
      await isolated_client.query('ROLLBACK')
      err.statusCode = 400
      throw err
    } finally {
      isolated_client.release()
    }
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid',
    user_id: 'uuid'
  })
  static async switch_clinic({
    user_id,
    clinic_id
  }: switch_active_clinic_payload) {
    const isolated_client = await spawnClient()

    try {
      await isolated_client.query('BEGIN')

      await clinic_position_api.update_record({
        options: {
          filters: {
            user_id,
            is_active: true
          },
          update_obj: {
            is_active: false
          }
        },
        client: isolated_client
      })

      const { rows } = await clinic_position_api.update_record({
        options: {
          filters: {
            user_id,
            clinic_id
          },
          update_obj: {
            is_active: true
          }
        },
        client: isolated_client
      })

      if (!rows.length) {
        const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_CLINIC_MEMBER_EX)
        ex.statusCode = 400
        throw ex
      }

      await isolated_client.query('COMMIT')

      return {
        success: true
      }
    } catch (err) {
      await isolated_client.query('ROLLBACK')
      err.statusCode = 400
      throw err
    } finally {
      isolated_client.release()
    }
  }

  @Validate((args) => args[0], {
    filter: {
      type: 'object',
      props: {
        clinic_id: 'uuid',
        medical_specialization_id: 'number'
      }
    },
    user_id: 'uuid',
    clinic_id: 'uuid',
    medical_specialization_id: {
      type: 'number',
      optional: true
    },
    medical_level_id: {
      type: 'number',
      optional: true
    },
    corporate_email: {
      type: 'string',
      optional: true,
      pattern: REGULAR_EXPRESSIONS.EMAIL
    },
    corporate_phone: {
      type: 'object',
      optional: true,
      props: {
        code: 'string',
        number: {
          type: 'number',
          convert: true
        }
      }
    },
    chat_allowed: {
      type: 'boolean',
      optional: true
    },
    audio_call_allowed: {
      type: 'boolean',
      optional: true
    },
    contact_directly_allowed: {
      type: 'boolean',
      optional: true
    },
    video_call_allowed: {
      type: 'boolean',
      optional: true
    },
    shifts: {
      type: 'array',
      empty: false,
      items: {
        type: 'object',
        props: {
          days: {
            type: 'array',
            items: 'number'
          },
          start: {
            type: 'string',
            pattern: REGULAR_EXPRESSIONS.TIME
          },
          finish: {
            type: 'string',
            pattern: REGULAR_EXPRESSIONS.TIME
          }
        }
      }
    },
    certificate: {
      type: 'object',
      optional: true,
      props: {
        attachment_id: 'string',
        certificate_number: {
          type: 'string',
          optional: true
        }
      }
    },
    consultation_slot: {
      type: 'object',
      optional: true,
      props: {
        from: {
          type: 'string',
          pattern: REGULAR_EXPRESSIONS.TIME
        },
        to: {
          type: 'string',
          pattern: REGULAR_EXPRESSIONS.TIME
        },
        time_slot: {
          type: 'number',
          min: 15,
          max: 60
        }
      }
    },
    home_visit_slot: {
      type: 'object',
      optional: true,
      props: {
        from: {
          type: 'string',
          pattern: REGULAR_EXPRESSIONS.TIME
        },
        to: {
          type: 'string',
          pattern: REGULAR_EXPRESSIONS.TIME
        },
        time_slot: {
          type: 'number',
          min: 15,
          max: 60
        }
      }
    },
    online_slot: {
      type: 'object',
      optional: true,
      props: {
        from: {
          type: 'string',
          pattern: REGULAR_EXPRESSIONS.TIME
        },
        to: {
          type: 'string',
          pattern: REGULAR_EXPRESSIONS.TIME
        },
        time_slot: {
          type: 'number',
          min: 15,
          max: 60
        }
      }
    },
    department_id: {
      type: 'number',
      optional: true
    },
    sub_role_id: 'number'
  })
  static async rebase_clinic_position_info({
    filter,
    user_id,
    clinic_id,
    medical_specialization_id,
    medical_level_id,
    shifts,
    video_call_allowed,
    contact_directly_allowed,
    audio_call_allowed,
    chat_allowed,
    corporate_email,
    corporate_phone,
    certificate,
    department_id,
    sub_role_id
  }: rebase_clinic_specialization_payload) {
    if (department_id) {
      const [report] = await clinic_department_api.get_record_list({
        options: {
          filters: {
            clinic_id,
            id: department_id
          }
        }
      })

      if (!report) {
        const ex = new Error(
          EXCEPTION_MESSAGES.ON_CLINIC_DEPARTMENT_DOES_NOT_BELONG_TO_CHOSEN_CLINIC
        )
        ex.statusCode = 412
        throw ex
      }
    } else {
      const clinic_departments = await clinic_department_api.get_record_list({
        options: {
          filters: {
            clinic_id
          },
          limit: 1
        }
      })

      if (clinic_departments.length > 0) {
        const ex = new Error(EXCEPTION_MESSAGES.ON_CLINIC_DEPARTMENT_REQUIRED)
        ex.statusCode = 412
        throw ex
      }
    }

    const isolated_client = await spawnClient()
    let telephone_id
    try {
      await isolated_client.query('BEGIN')

      if (corporate_phone) {
        telephone_id = await get_or_create_telephone_handler({
          payload: corporate_phone,
          client: isolated_client
        })

        if (!telephone_id) {
          const ex = new Error(
            EXCEPTION_MESSAGES.ON_FAILED_PROCEED_MOBILE_NUMBER_EX
          )
          ex.statusCode = 400
          throw ex
        }
      }

      await clinic_position_api.delete_record({
        options: {
          ...filter,
          user_id
        },
        client: isolated_client
      })

      await clinic_position_api.create_record({
        options: {
          user_id,
          clinic_id,
          medical_specialization_id,
          medical_level_id,
          chat_allowed,
          audio_call_allowed,
          contact_directly_allowed,
          video_call_allowed,
          corporate_phone_id: telephone_id,
          corporate_email,
          certificate: (certificate && certificate.attachment_id) || null,
          certificate_number:
            (certificate && certificate.certificate_number) || null,
          department_id,
          sub_role_id
        },
        client: isolated_client
      })

      await Promise.all(
        shifts.map(
          (
            {
              days,
              start,
              finish,
              online_slot,
              home_visit_slot,
              consultation_slot
            },
            index
          ) =>
            Promise.all(
              days.map((day) =>
                clinic_position_schedule_api.create_record({
                  options: {
                    user_id,
                    clinic_id,
                    medical_specialization_id,
                    stack_id: index,
                    start: {
                      day,
                      hour: +start.slice(0, 2),
                      minute: +start.slice(3, 5)
                    },
                    finish: {
                      day,
                      hour: +finish.slice(0, 2),
                      minute: +finish.slice(3, 5)
                    },
                    ...(consultation_slot
                      ? {
                          consultation_slot_from: {
                            day,
                            hour: +consultation_slot.from.slice(0, 2),
                            minute: +consultation_slot.from.slice(3, 5)
                          },
                          consultation_slot_to: {
                            day,
                            hour: +consultation_slot.to.slice(0, 2),
                            minute: +consultation_slot.to.slice(3, 5)
                          },
                          consultation_slot_interval:
                            consultation_slot.time_slot
                        }
                      : {}),
                    ...(home_visit_slot
                      ? {
                          home_visit_slot_from: {
                            day,
                            hour: +home_visit_slot.from.slice(0, 2),
                            minute: +home_visit_slot.from.slice(3, 5)
                          },
                          home_visit_slot_to: {
                            day,
                            hour: +home_visit_slot.to.slice(0, 2),
                            minute: +home_visit_slot.to.slice(3, 5)
                          },
                          home_visit_slot_interval: home_visit_slot.time_slot
                        }
                      : {}),
                    ...(online_slot
                      ? {
                          online_slot_from: {
                            day,
                            hour: +online_slot.from.slice(0, 2),
                            minute: +online_slot.from.slice(3, 5)
                          },
                          online_slot_to: {
                            day,
                            hour: +online_slot.to.slice(0, 2),
                            minute: +online_slot.to.slice(3, 5)
                          },
                          online_slot_interval: online_slot.time_slot
                        }
                      : {})
                  },
                  client: isolated_client
                })
              )
            )
        )
      )

      await isolated_client.query('COMMIT')

      return {
        success: true
      }
    } catch (err) {
      await isolated_client.query('ROLLBACK')
      err.statusCode = 400
      throw err
    } finally {
      await isolated_client.release()
    }
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid',
    user_id: 'uuid',
    medical_specialization_id: 'number'
  })
  static async leave_clinic({
    clinic_id,
    medical_specialization_id,
    user_id
  }: leave_clinic_payload) {
    const [is_active_clinic] = await clinic_position_api.get_records({
      options: {
        filters: {
          user_id,
          clinic_id,
          is_active: true
        }
      }
    })

    if (is_active_clinic) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_CANT_LEAVE_ACTIVE_CLINIC_EX)
      ex.statusCode = 412
      throw ex
    }

    const { rowCount } = await clinic_position_api.delete_record({
      options: {
        clinic_id,
        medical_specialization_id,
        user_id
      }
    })

    return { success: !!rowCount }
  }

  @Validate((args) => args[0], {
    clinic_id: {
      type: 'uuid',
      optional: true
    },
    medical_specialization_id: {
      type: 'number',
      optional: true
    },
    user_id: 'uuid'
  })
  static async get_user_specializations({
    user_id,
    clinic_id,
    medical_specialization_id
  }: get_user_specializations_payload) {
    return clinic_position_api.get_users_specializations({
      options: {
        user_id,
        medical_specialization_id,
        clinic_id
      }
    })
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid',
    page: {
      type: 'number',
      convert: true,
      optional: true
    },
    count: {
      type: 'number',
      convert: true,
      optional: true
    },
    search: {
      type: 'string',
      optional: true
    },
    medical_specialization_ids: {
      type: 'array',
      items: 'number',
      optional: true
    },
    rating_from: {
      type: 'number',
      optional: true
    },
    rating_to: {
      type: 'number',
      optional: true
    }
  })
  static async get_clinic_professionals({
    clinic_id,
    count,
    page,
    search,
    medical_specialization_ids,
    rating_from,
    rating_to
  }: get_clinic_professionals_payload) {
    return clinic_position_api.get_clinics_professionals({
      options: {
        clinic_id,
        search,
        limit: count ? count : undefined,
        offset: count && page ? count * (page - 1) : 0,
        medical_specialization_ids,
        rating_from,
        rating_to
      }
    })
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid',
    offset: {
      type: 'number',
      convert: true,
      optional: true
    },
    limit: {
      type: 'number',
      convert: true,
      optional: true
    },
    search: {
      type: 'string',
      optional: true
    }
  })
  static async get_clinic_professionals_new({
    clinic_id,
    limit,
    offset,
    search
  }: any) {
    return clinic_position_api.get_clinics_professionals_new({
      options: {
        clinic_id,
        search,
        limit: limit ? limit : 1000,
        offset: offset ? offset : 0
      }
    })
  }

  @Validate((args) => args[0], {
    doctor_id: 'uuid',
    clinic_id: 'uuid',
    date: {
      type: 'date',
      convert: true
    },
    type: {
      type: 'string',
      enum: ['CONSULTATION', 'HOME_VISIT', 'CALL']
    }
  })
  static async get_time_slots({
    doctor_id,
    clinic_id,
    date,
    type
  }: get_time_slots_payload) {
    if (type === 'CALL') {
      const online_consultation_status =
        await waiting_room_api.online_consultation_get_status({
          options: {
            clinic_id
          }
        })

      if (online_consultation_status.allow_online_consultation === false) {
        const ex = new Error(EXCEPTION_MESSAGES.ON_ONLINE_CONSULTATION_BLOCKED)
        ex.statusCode = 400
        throw ex
      }
    }

    const matched_shifts =
      await clinic_position_schedule_api.get_shifts_for_day({
        options: {
          user_id: doctor_id,
          clinic_id,
          type,
          day: new Date(date).getDay()
        }
      })
    const results: {}[] = []

    const isolated_client = await spawnClient()

    await isolated_client.query(`set timezone = 'UTC'`)

    try {
      await Promise.all(
        matched_shifts.map(async ({ start, finish, time_slot_interval }) => {
          const rows = await clinic_position_schedule_api.get_time_slots({
            client: isolated_client,
            options: {
              clinic_id,
              user_id: doctor_id,
              finish,
              start,
              date,
              time_slot_interval
            }
          })

          results.push(...rows)
        })
      )
    } catch (err) {
      err.statusCode = 400
      throw err
    } finally {
      await isolated_client.release()
    }

    return results
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    doctor_id: {
      type: 'uuid',
      optional: true
    },
    department_id: {
      type: 'number',
      integer: true,
      positive: true,
      convert: true
    }
  })
  static async change_department({
    user_id,
    department_id,
    doctor_id
  }: change_department_payload) {
    let work_user_id = user_id
    let requester_clinic_position: any
    if (doctor_id) {
      ;[requester_clinic_position] = await clinic_position_api.get_records({
        options: {
          filters: {
            user_id,
            is_active: true,
            is_admin: true
          }
        }
      })

      if (!requester_clinic_position) {
        const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_ADMIN_OF_THE_CLINIC_EX)
        ex.statusCode = 400
        throw ex
      }

      work_user_id = doctor_id
    } else {
      ;[requester_clinic_position] = await clinic_position_api.get_records({
        options: {
          filters: {
            user_id: work_user_id,
            is_active: true
          }
        }
      })
      if (!requester_clinic_position) {
        const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_CLINIC_STUFF_EX)
        ex.statusCode = 400
        throw ex
      }
    }

    const [report] = await clinic_department_api.get_record_list({
      options: {
        filters: {
          clinic_id: requester_clinic_position.clinic_id,
          id: department_id
        }
      }
    })
    if (!report) {
      const ex = new Error(
        EXCEPTION_MESSAGES.ON_CLINIC_DEPARTMENT_DOES_NOT_BELONG_TO_CHOSEN_CLINIC
      )
      ex.statusCode = 400
      throw ex
    }

    await clinic_position_api.change_department({
      options: {
        user_id: work_user_id,
        clinic_id: requester_clinic_position.clinic_id,
        department_id
      }
    })
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid'
  })
  static async doctors_by_clinic({
    clinic_id,
    userId
  }: doctors_by_clinic_payload) {
    return await clinic_position_api.doctors_by_clinic({
      options: { clinic_id }
    })
  }
}
