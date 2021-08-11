import { clinic_api } from './../../features/clinics/api'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import fetch from 'node-fetch'
import {
  delete_record_payload,
  create_waiting_room_payload,
  get_waiting_rooms_list_payload,
  update_waiting_room_payload,
  join_waiting_room_payload,
  leave_waiting_room_payload,
  pick_participant_from_queue_payload,
  refer_patient_payload,
  release_patient_payload,
  get_group_participants_payload,
  check_out_from_waiting_room_payload,
  doctor_check_in_waiting_room_payload,
  get_doctor_waiting_room_payload,
  get_waiting_room_doctors_payload,
  move_doctor_to_waiting_room_payload,
  delete_doctor_from_waiting_room_payload,
  get_patient_available_waiting_rooms_payload,
  get_user_waiting_rooms_payload,
  set_online_consultation_status_payload,
  get_online_consultation_status_payload,
  waiting_rooms_by_ids_payload,
  waiting_rooms_by_clinic_payload,
  ask_patient_payload,
  force_remove_patient_from_wr_payload,
  get_time_data_post_join_wr_payload,
  add_staff_payload,
  create_request_payload,
  remove_staff_payload,
  doctor_waiting_rooms_payload,
  requests_list_payload,
  change_access_payload
} from './types'
import { waiting_room_api } from '../../features/waiting_room'
import { Validate } from '../../etc/helpers'
import { clinic_position_api } from '../../features/clinic_position/api'
import { ACCESS_ROLES, EXCEPTION_MESSAGES, SUBSCRIPTIONS_TYPES } from '../../constants'
import { waiting_room_participant_api } from '../../features/waiting_room_participant'
import { internal_commutator } from '../../internal_commutator'
import { doctor_waiting_room_api } from '../../features/doctor_waiting_room'
import { auto_booking_api } from '../../features/auto_booking'
import { countries_api } from '../../features/countries/api'
import get_or_create_telephone_handler from '../../handlers/telephones/get_or_create'
import get_invite from '../../handlers/invites/get'

export class waiting_room_domain {
  @Validate((args) => args[0], {
    user_id: 'uuid',
    clinic_id: 'uuid',
    title: 'string',
    avatar_id: {
      type: 'uuid',
      optional: true
    },
    booking_only: {
      type: 'boolean',
      optional: true
    },
    medical_specializations_id: {
      type: 'number',
      optional: true
    },
    per_invitation_only: {
      type: 'boolean',
      optional: true
    },
    schedules: {
      type: 'array',
      empty: true,
      items: {
        type: 'object',
        props: {
          time_from: 'string',
          time_to: 'string',
          clinic_consultation: {
            type: 'object',
            optional: true,
            props: {
              duration: {
                type: 'string'
              },
              price: {
                type: 'number'
              },
              payment_mode: {
                type: 'number'
              },
              clinic_approved: {
                type: 'boolean',
                convert: true
              }
            }
          },
          online_consultation: {
            type: 'object',
            optional: true,
            props: {
              duration: {
                type: 'string'
              },
              price: {
                type: 'number'
              },
              payment_mode: {
                type: 'number'
              },
              clinic_approved: {
                type: 'boolean',
                convert: true
              }
            }
          },
          home_visit: {
            type: 'object',
            optional: true,
            props: {
              duration: {
                type: 'string'
              },
              price: {
                type: 'number'
              },
              payment_mode: {
                type: 'number'
              },
              clinic_approved: {
                type: 'boolean',
                convert: true
              }
            }
          }
        }
      }
    },
    telephone: {
      type: 'string',
      optional: true
    },
    email: {
      type: 'email',
      optional: true
    },
    participant_doctors: {
      type: 'array',
      optional: true,
      empty: true,
      items: {
        type: 'string'
      }
    }
  })
  static async create_waiting_room({
    user_id,
    clinic_id,
    title,
    avatar_id,
    booking_only,
    medical_specializations_id,
    per_invitation_only,
    schedules,
    email,
    telephone,
    participant_doctors
  }: create_waiting_room_payload) {
    const [requester_clinic_position] = await clinic_position_api.get_records({
      options: {
        filters: {
          clinic_id,
          user_id,
          is_admin: true
        }
      }
    })

    if (!requester_clinic_position) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_ADMIN_OF_THE_CLINIC_EX)
      ex.statusCode = 400
      throw ex
    }

    const clinic_admins = await clinic_position_api.get_records({
      options: {
        filters: {
          clinic_id,
          is_admin: true
        }
      }
    })

    let phone_id: any
    if (telephone) {
      const err = new Error(EXCEPTION_MESSAGES.ON_FAILED_PROCEED_TEL_NUMBER_EX)
      err.statusCode = 400
      let format_number = telephone.trim()
      if (format_number[0] !== '+') format_number = `+${format_number}`

      let parse_number = parsePhoneNumberFromString(format_number)

      if (!(parse_number && parse_number.isValid())) {
        const country_params = await countries_api.get_user_country_info({
          options: user_id
        })
        if (!(country_params && country_params.isoCode)) throw err

        parse_number = parsePhoneNumberFromString(
          telephone,
          country_params.isoCode
        )
        if (!(parse_number && parse_number.isValid())) throw err
      }

      phone_id = await get_or_create_telephone_handler({
        payload: {
          code: `+${parse_number.countryCallingCode}`,
          number: Number.parseInt(parse_number.nationalNumber.toString())
        }
      })

      if (!phone_id) throw err
    }

    const { id } = await waiting_room_api.insert_record({
      options: {
        created_by: user_id,
        clinic_id,
        title,
        avatar_id,
        booking_only,
        medical_specializations_id,
        per_invitation_only,
        telephone_id: telephone ? phone_id : undefined,
        email
      }
    })

    if (schedules && schedules.length) {
      await Promise.all(
        schedules.map(
          ({
            day_of_week,
            time_from,
            time_to,
            clinic_consultation,
            online_consultation,
            home_visit
          }) => {
            let schedule_object: any = {
              waiting_room_id: id,
              clinic_id,
              time_from,
              time_to,
              day_of_week,
              clinic_consultation: false,
              clinic_consultation_duration: '00:00:00',
              clinic_consultation_price: 0,
              clinic_consultation_payment_mode: 0,
              clinic_consultation_clinic_approved: false,
              online_consultation: false,
              online_consultation_duration: '00:00:00',
              online_consultation_price: 0,
              online_consultation_payment_mode: 0,
              online_consultation_clinic_approved: false,
              home_visit: false,
              home_visit_duration: '00:00:00',
              home_visit_price: 0,
              home_visit_payment_mode: 0,
              home_visit_clinic_approved: false
            }

            if (clinic_consultation) {
              schedule_object.clinic_consultation = true
              schedule_object.clinic_consultation_duration =
                clinic_consultation.duration
              schedule_object.clinic_consultation_price =
                clinic_consultation.price
              schedule_object.clinic_consultation_payment_mode =
                clinic_consultation.payment_mode
              schedule_object.clinic_consultation_clinic_approved =
                clinic_consultation.clinic_approved
            }

            if (online_consultation) {
              schedule_object.online_consultation = true
              schedule_object.clinic_consultation_duration =
                online_consultation.duration
              schedule_object.clinic_consultation_price =
                online_consultation.price
              schedule_object.clinic_consultation_payment_mode =
                online_consultation.payment_mode
              schedule_object.clinic_consultation_clinic_approved =
                online_consultation.clinic_approved
            }

            if (home_visit) {
              schedule_object.home_visit = true
              schedule_object.home_visit_duration = home_visit.duration
              schedule_object.home_visit_price = home_visit.price
              schedule_object.home_visit_payment_mode = home_visit.payment_mode
              schedule_object.home_visit_clinic_approved =
                home_visit.clinic_approved
            }

            auto_booking_api.upsert_record({
              options: schedule_object
            })
          }
        )
      )
    }

    if (participant_doctors && participant_doctors.length) {
      await Promise.all([
        participant_doctors.map(async (doctor) => {
          let doctor_available_in_wr =
            await doctor_waiting_room_api.get_waiting_room_doctors({
              options: {
                filters: {
                  user_id: doctor
                }
              }
            })

          if (doctor_available_in_wr.length) {
            if (clinic_admins && clinic_admins.length) {
              clinic_admins.map(async (admin) => {
                await clinic_api.create_approved_position_for_wr({
                  options: {
                    clinic_id,
                    staff_id: doctor,
                    admin_id: admin.user_id,
                    room_id: id
                  }
                })
              })
            }
            internal_commutator.emit(
              SUBSCRIPTIONS_TYPES.ON_DOCTOR_ALREADY_IN_WR,
              {
                clinic_id
              }
            )
          } else {
            await doctor_waiting_room_api.upsert_record({
              options: {
                waiting_room_id: id,
                user_id: doctor
              }
            })
          }
        })
      ])
    }

    return {
      id
    }
  }

  @Validate((args) => args[0], {
    id: 'number',
    user_id: 'uuid',
    title: {
      type: 'string',
      optional: true
    },
    avatar_id: {
      type: 'uuid',
      optional: true
    },
    open_from: {
      type: 'string',
      optional: true
    },
    open_to: {
      type: 'string',
      optional: true
    },
    booking_only: {
      type: 'boolean',
      optional: true
    },
    medical_specializations_id: {
      type: 'number',
      optional: true
    },
    per_invitation_only: {
      type: 'boolean',
      optional: true
    },
    schedules: {
      type: 'array',
      empty: true,
      items: {
        type: 'object',
        props: {
          time_from: 'string',
          time_to: 'string',
          clinic_consultation: {
            type: 'object',
            optional: true,
            props: {
              duration: {
                type: 'string'
              },
              price: {
                type: 'number'
              },
              payment_mode: {
                type: 'number'
              },
              clinic_approved: {
                type: 'boolean',
                convert: true
              }
            }
          },
          online_consultation: {
            type: 'object',
            optional: true,
            props: {
              duration: {
                type: 'string'
              },
              price: {
                type: 'number'
              },
              payment_mode: {
                type: 'number'
              },
              clinic_approved: {
                type: 'boolean',
                convert: true
              }
            }
          },
          home_visit: {
            type: 'object',
            optional: true,
            props: {
              duration: {
                type: 'string'
              },
              price: {
                type: 'number'
              },
              payment_mode: {
                type: 'number'
              },
              clinic_approved: {
                type: 'boolean',
                convert: true
              }
            }
          }
        }
      }
    },
    telephone: {
      type: 'string',
      optional: true
    },
    email: {
      type: 'email',
      optional: true
    },
    participant_doctors: {
      type: 'array',
      optional: true,
      empty: true,
      items: {
        type: 'string'
      }
    }
  })
  static async update_waiting_room({
    id,
    user_id,
    avatar_id,
    open_from,
    open_to,
    title,
    booking_only,
    medical_specializations_id,
    per_invitation_only,
    schedules,
    telephone,
    email,
    participant_doctors
  }: update_waiting_room_payload) {
    const [waiting_room_record] = await waiting_room_api.get_record_list({
      options: {
        filters: {
          id
        }
      }
    })

    if (!waiting_room_record) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_WRONG_INPUT_EXCEPTION)
      ex.statusCode = 400
      throw ex
    }

    const [requester_clinic_position] = await clinic_position_api.get_records({
      options: {
        filters: {
          clinic_id: waiting_room_record.clinic_id,
          user_id,
          is_admin: true
        }
      }
    })

    if (!requester_clinic_position) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_ADMIN_OF_THE_CLINIC_EX)
      ex.statusCode = 400
      throw ex
    }

    const clinic_admins = await clinic_position_api.get_records({
      options: {
        filters: {
          clinic_id: waiting_room_record.clinic_id,
          is_admin: true
        }
      }
    })

    let phone_id: any
    if (telephone) {
      const err = new Error(EXCEPTION_MESSAGES.ON_FAILED_PROCEED_TEL_NUMBER_EX)
      err.statusCode = 400
      let format_number = telephone.trim()
      if (format_number[0] !== '+') format_number = `+${format_number}`

      let parse_number = parsePhoneNumberFromString(format_number)

      if (!(parse_number && parse_number.isValid())) {
        const country_params = await countries_api.get_user_country_info({
          options: user_id
        })
        if (!(country_params && country_params.isoCode)) throw err

        parse_number = parsePhoneNumberFromString(
          telephone,
          country_params.isoCode
        )
        if (!(parse_number && parse_number.isValid())) throw err
      }

      phone_id = await get_or_create_telephone_handler({
        payload: {
          code: `+${parse_number.countryCallingCode}`,
          number: Number.parseInt(parse_number.nationalNumber.toString())
        }
      })

      if (!phone_id) throw err
    }

    const [updated_record] = await waiting_room_api.update_record({
      options: {
        filters: {
          id
        },
        update_obj: {
          avatar_id,
          open_to,
          open_from,
          title,
          booking_only,
          medical_specializations_id,
          per_invitation_only,
          telephone_id: telephone ? phone_id : telephone,
          email
        }
      }
    })

    await auto_booking_api.delete_record({
      options: {
        filters: {
          waiting_room_id: id
        }
      }
    })

    if (schedules && schedules.length) {
      await Promise.all(
        schedules.map(
          ({
            day_of_week,
            time_from,
            time_to,
            clinic_consultation,
            online_consultation,
            home_visit
          }) => {
            let schedule_object: any = {
              waiting_room_id: id,
              clinic_id: waiting_room_record.clinic_id,
              time_from,
              time_to,
              day_of_week,
              clinic_consultation: false,
              clinic_consultation_duration: '00:15:00',
              clinic_consultation_price: 0,
              clinic_consultation_payment_mode: 0,
              clinic_consultation_clinic_approved: false,
              online_consultation: false,
              online_consultation_duration: '00:15:00',
              online_consultation_price: 0,
              online_consultation_payment_mode: 0,
              online_consultation_clinic_approved: false,
              home_visit: false,
              home_visit_duration: '00:15:00',
              home_visit_price: 0,
              home_visit_payment_mode: 0,
              home_visit_clinic_approved: false
            }

            if (clinic_consultation) {
              schedule_object.clinic_consultation = true
              schedule_object.clinic_consultation_duration =
                clinic_consultation.duration
              schedule_object.clinic_consultation_price =
                clinic_consultation.price
              schedule_object.clinic_consultation_payment_mode =
                clinic_consultation.payment_mode
              schedule_object.clinic_consultation_clinic_approved =
                clinic_consultation.clinic_approved
            }

            if (online_consultation) {
              schedule_object.online_consultation = true
              schedule_object.clinic_consultation_duration =
                online_consultation.duration
              schedule_object.clinic_consultation_price =
                online_consultation.price
              schedule_object.clinic_consultation_payment_mode =
                online_consultation.payment_mode
              schedule_object.clinic_consultation_clinic_approved =
                online_consultation.clinic_approved
            }

            if (home_visit) {
              schedule_object.home_visit = true
              schedule_object.home_visit_duration = home_visit.duration
              schedule_object.home_visit_price = home_visit.price
              schedule_object.home_visit_payment_mode = home_visit.payment_mode
              schedule_object.home_visit_clinic_approved =
                home_visit.clinic_approved
            }

            auto_booking_api.upsert_record({
              options: schedule_object
            })
          }
        )
      )
    }

    if (participant_doctors && participant_doctors.length) {
      await Promise.all([
        participant_doctors.map(async (doctor) => {
          let doctor_available_in_wr =
            await doctor_waiting_room_api.get_waiting_room_doctors({
              options: {
                filters: {
                  user_id: doctor
                }
              }
            })

          if (doctor_available_in_wr.length) {
            if (clinic_admins && clinic_admins.length) {
              clinic_admins.map(async (admin) => {
                await clinic_api.create_approved_position_for_wr({
                  options: {
                    clinic_id: waiting_room_record.clinic_id,
                    staff_id: doctor,
                    admin_id: admin.user_id,
                    room_id: id
                  }
                })
              })
            }
            internal_commutator.emit(
              SUBSCRIPTIONS_TYPES.ON_DOCTOR_ALREADY_IN_WR,
              {
                clinic_id: waiting_room_record.clinic_id
              }
            )
          } else {
            await doctor_waiting_room_api.upsert_record({
              options: {
                waiting_room_id: id,
                user_id: doctor
              }
            })
          }
        })
      ])
    }

    return {
      success: !!updated_record
    }
  }

  @Validate((args) => args[0], {
    id: {
      type: 'number',
      optional: true,
      convert: true
    },
    clinic_id: 'uuid',
    medical_specializations_ids: {
      type: 'array',
      items: 'number',
      optional: true
    },
    booking_only: {
      type: 'array',
      items: 'boolean',
      optional: true
    },
    search: {
      type: 'string',
      optional: true
    },
    limit: {
      type: 'number',
      optional: true,
      convert: true
    },
    offset: {
      type: 'number',
      optional: true,
      convert: true
    },
    order_by: {
      type: 'string',
      optional: true,
      enum: ['booking_only', 'title', 'medical_specializations_id']
    },
    sort_order: {
      type: 'number',
      convert: true,
      optional: true
    }
  })
  static async get_waiting_rooms_list({
    clinic_id,
    limit = 15,
    offset = 0,
    id,
    medical_specializations_ids,
    booking_only,
    search,
    order_by,
    sort_order,
    open
  }: get_waiting_rooms_list_payload) {
    return {
      rows: await waiting_room_api.get_record_list({
        options: {
          filters: {
            id: id ? +id : id,
            clinic_id,
            booking_only,
            search,
            medical_specializations_ids
          },
          order_by,
          sort_order: sort_order ? +sort_order : sort_order,
          limit,
          offset
        }
      }),
      total_count: await waiting_room_api.get_records_total_count({
        options: {
          filters: {
            id: id ? +id : id,
            clinic_id,
            booking_only,
            search,
            medical_specializations_ids
          }
        }
      })
    }
  }

  @Validate((args) => args[0], {
    id: 'number',
    user_id: 'uuid'
  })
  static async delete_waiting_room({ id, user_id }: delete_record_payload) {
    const [waiting_room_record] = await waiting_room_api.get_record_list({
      options: {
        filters: {
          id
        }
      }
    })

    if (!waiting_room_record) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_WRONG_INPUT_EXCEPTION)
      ex.statusCode = 400
      throw ex
    }

    const [requester_clinic_position] = await clinic_position_api.get_records({
      options: {
        filters: {
          clinic_id: waiting_room_record.clinic_id,
          user_id,
          is_admin: true
        }
      }
    })

    if (!requester_clinic_position) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_ADMIN_OF_THE_CLINIC_EX)
      ex.statusCode = 400
      throw ex
    }

    const { rowCount } = await waiting_room_api.delete_record({
      options: {
        filters: {
          id
        }
      }
    })

    return {
      success: rowCount > 0
    }
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    room_id: 'number',
    symptoms: 'string',
    description: 'string',
    body_part_ids: {
      type: 'array',
      items: 'number'
    },
    patient_id: 'uuid',
    role: 'string'
  })
  static async join_waiting_room_queue({
    room_id,
    user_id,
    symptoms,
    description,
    body_part_ids,
    patient_id,
    role
  }: join_waiting_room_payload) {
    if (role !== 'patient') {
      const data = await doctor_waiting_room_api.check_responsible_person({
        options: {
          room_id,
          user_id
        }
      }) as any
      if (data.length && data[0].is_responsible_person == false) {
        const ex = new Error(EXCEPTION_MESSAGES.ON_ACCESS_DENIED_EXCEPTION);
        ex.statusCode = 400;
        throw ex;
      }
    }

    const [waiting_room_record] = await waiting_room_api.get_record_list({
      options: {
        filters: {
          id: room_id,
          booking_only: false
        }
      }
    })

    if (!waiting_room_record) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_WAITING_ROOM_ROOM_PRIVATE_EX)
      ex.statusCode = 412
      throw ex
    }

    const existing_participants =
      await waiting_room_participant_api.get_record_list({
        options: {
          filters: {
            room_id
          }
        }
      })

    if (existing_participants.find((record) => record.user_id === user_id)) {
      const ex = new Error(EXCEPTION_MESSAGES.ALREADY_MEMBER_OF_WAITING_ROOM_EX)
      ex.statusCode = 412
      throw ex
    }

    const next_45_minutes_ts = new Date(
      new Date().setMinutes(new Date().getMinutes() + 45)
    )
    const post_45_mins_ts = new Date(
      new Date(next_45_minutes_ts).setMinutes(
        new Date(next_45_minutes_ts).getMinutes() + 5
      )
    )

    const record = await waiting_room_participant_api.upsert_record({
      options: {
        room_id,
        user_id: (patient_id) ? patient_id : user_id,
        symptoms,
        description,
        body_part_ids,
        next_45_minutes_ts,
        post_45_mins_ts
      }
    })

    if (record) {
      var doctor_in_waiting_room = await doctor_waiting_room_api.check_doctor_presence_in_wr({
        options: {
          room_id
        }
      }) as any;
      let doctor_in_waiting_room_bool = doctor_in_waiting_room.length ? true : false;
      if (!doctor_in_waiting_room_bool) {
        var all_responsible_persons = await clinic_position_api.get_all_responsible_persons({
          options: { clinic_id: record.clinic_id, room_id }
        }) as any;
        if (all_responsible_persons.length) {
          all_responsible_persons.map(({ user_id }: any) => {
            internal_commutator.emit(SUBSCRIPTIONS_TYPES.ON_NO_DOCTOR_IN_WR, {
              room_id,
              user_id
            })
          })
        }
      }

      internal_commutator.emit(SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_JOINED, {
        room_id,
        user_id
      })

      const waiting_rooms_doctors = await doctor_waiting_room_api.get_records({
        options: {
          filters: {
            waiting_room_id: room_id
          }
        }
      })

      return {
        success: true,
        queue_number: existing_participants.length + 1,
        estimated_time:
          ((existing_participants.length + 1) * 5) /
          (waiting_rooms_doctors.length ? waiting_rooms_doctors.length : 1),
        next_45_minutes_ts: next_45_minutes_ts,
        post_45_mins_ts: post_45_mins_ts
      }
    }
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    room_id: 'number',
    patient_id: 'uuid',
    role: 'string'
  })
  static async leave_waiting_room_queue({
    room_id,
    user_id,
    patient_id,
    role
  }: leave_waiting_room_payload) {
    if (role !== 'patient') {
      const data = await doctor_waiting_room_api.check_responsible_person({
        options: {
          room_id,
          user_id
        }
      }) as any
      if (data.length && data[0].is_responsible_person == false) {
        const ex = new Error(EXCEPTION_MESSAGES.ON_ACCESS_DENIED_EXCEPTION);
        ex.statusCode = 400;
        throw ex;
      }
    }

    const { rowCount } = await waiting_room_participant_api.delete_record({
      options: {
        filters: {
          room_id,
          user_id: (patient_id) ? patient_id : user_id
        }
      }
    })

    if (rowCount)
      internal_commutator.emit(SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_LEFT, {
        room_id,
        user_id
      })

    return {
      success: rowCount > 0
    }
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    room_id: 'number',
    target_id: 'uuid',
    target_room_id: 'number'
  })
  static async refer_patient({
    user_id,
    room_id,
    target_id,
    target_room_id
  }: refer_patient_payload) {
    await waiting_room_participant_api.update_record({
      options: {
        filters: {
          user_id: target_id,
          room_id
        },
        update_obj: {
          room_id: target_room_id,
          picked_by: null
        }
      }
    })

    internal_commutator.emit(SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_REFERRED, {
      room_id,
      user_id,
      target_id,
      target_room_id
    })

    return {
      success: true
    }
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    room_id: 'number',
    target_id: 'uuid',
    event_id: 'number'
  })
  static async pick_participant_from_queue({
    user_id,
    room_id,
    target_id,
    event_id,
    auth_token,
    role
  }: pick_participant_from_queue_payload) {
    // get associated_event_data
    let associated_event =
      (await waiting_room_participant_api.get_wr_particpant_associated_event({
        options: {
          room_id,
          participant_id: target_id,
          event_id: event_id
        }
      })) as any,
      headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: auth_token
      },
      permission_error = new Error(EXCEPTION_MESSAGES.ON_ACCESS_DENIED_EXCEPTION)
    permission_error.statusCode = 400;

    if (associated_event.rows.length) {
      const event_data = associated_event.rows[0]
      if (role !== ACCESS_ROLES.doctor) {
        if (event_data.waiting_room_id) {
          let data = await waiting_room_participant_api.is_access_of_responsible_person({
            options: { loggedInUser: user_id, clinic_id: event_data.clinic_id, room_id: event_data.waiting_room_id }
          });
          if (data && !(data.is_responsible_person)) throw permission_error
        } else {
          throw permission_error;
        }
      }

      if (event_data.is_captured) {
        const error = new Error(EXCEPTION_MESSAGES.ON_PAYMENT_ALREADY_DONE)
        error.statusCode = 400
        throw error
      }

      if (!event_data.payment_intent_id) {
        const error = new Error(EXCEPTION_MESSAGES.ON_PAYMENT_NOT_HOLDED)
        error.statusCode = 400
        throw error
      }

      let payment_captured_data = (await fetch(
        String(process.env.STRIPE_PAYMENT_CAPTURE_URL),
        {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            payment_intent_id: event_data.payment_intent_id
          })
        } as any
      )) as any

      if (
        payment_captured_data.status == 200 &&
        payment_captured_data.statusText == 'OK'
      ) {
        await waiting_room_participant_api.update_captured_status_for_pick_by_doctor(
          { options: { event_id } }
        )
      } else {
        const err = new Error(EXCEPTION_MESSAGES.ON_PAYMENT_ERROR)
        err.statusCode = 400
        throw err
      }
    } else {
      const error = new Error(EXCEPTION_MESSAGES.EVENT_DOES_NOT_EXIST_EXCEPTION)
      error.statusCode = 400
      throw error
    }

    const [record] = await waiting_room_participant_api.update_record({
      options: {
        filters: {
          user_id: target_id,
          room_id
        },
        update_obj: {
          picked_by: user_id
        }
      }
    })

    if (record)
      internal_commutator.emit(SUBSCRIPTIONS_TYPES.ON_PARTICIPANT_PICKED, {
        room_id,
        user_id,
        target_id
      })

    return {
      success: !!record
    }
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    room_id: 'number',
    target_id: 'uuid'
  })
  static async release_patient_payload({
    room_id,
    target_id,
    user_id
  }: release_patient_payload) {
    const { rowCount } = await waiting_room_participant_api.delete_record({
      options: {
        filters: {
          room_id,
          user_id: target_id
        }
      }
    })

    if (rowCount)
      internal_commutator.emit(SUBSCRIPTIONS_TYPES.ON_PATIENT_RELEASED, {
        room_id,
        user_id,
        target_id
      })

    return {
      success: rowCount > 0
    }
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    room_id: {
      type: 'number',
      convert: true
    },
    limit: {
      type: 'number',
      optional: true,
      convert: true
    },
    offset: {
      type: 'number',
      optional: true,
      convert: true
    }
  })
  static async get_group_participants_list({
    user_id,
    room_id,
    offset = 0,
    limit = 15
  }: get_group_participants_payload) {
    return waiting_room_participant_api.get_mapped_records({
      options: {
        filters: {
          room_id
        },
        offset,
        limit
      }
    })
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    room_id: 'number'
  })
  static async doctor_check_in_waiting_room({
    room_id,
    user_id
  }: doctor_check_in_waiting_room_payload) {
    const invite_record = await get_invite({ options: { user_id } })

    const [waiting_room_record] = await waiting_room_api.get_record_list({
      options: {
        filters: {
          id: room_id,
          per_invitation_only:
            invite_record && invite_record.waiting_room_id === room_id
              ? undefined
              : false
        }
      }
    })

    if (!waiting_room_record) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_WAITING_ROOM_INVITES_ONLY_EX)
      ex.statusCode = 412
      throw ex
    }

    return doctor_waiting_room_api.upsert_record({
      options: {
        waiting_room_id: room_id,
        user_id
      }
    })
  }

  @Validate((args) => args[0], {
    user_id: 'uuid'
  })
  static async doctor_check_out_from_waiting_room({
    user_id
  }: check_out_from_waiting_room_payload) {
    const { rowCount } = await doctor_waiting_room_api.delete_records({
      options: {
        filters: {
          user_id
        }
      }
    })

    return {
      success: rowCount > 0
    }
  }

  @Validate((args) => args[0], {
    user_id: 'uuid'
  })
  static async get_doctor_waiting_room({
    user_id
  }: get_doctor_waiting_room_payload) {
    const [record] = await doctor_waiting_room_api.get_records({
      options: {
        filters: {
          user_id
        }
      }
    })

    return record
  }

  @Validate((args) => args[0], {
    room_id: {
      type: 'number',
      convert: true
    }
  })
  static async get_waiting_room_doctors({
    room_id
  }: get_waiting_room_doctors_payload) {
    return doctor_waiting_room_api.get_waiting_room_doctors({
      options: {
        filters: {
          waiting_room_id: room_id
        }
      }
    })
  }

  @Validate((args) => args[0], {
    target_id: 'uuid',
    target_room_id: 'number',
    user_id: 'uuid'
  })
  static async move_doctor_to_waiting_room({
    target_id,
    target_room_id,
    user_id
  }: move_doctor_to_waiting_room_payload) {
    const [waiting_room_record] = await waiting_room_api.get_record_list({
      options: {
        filters: {
          id: target_room_id
        }
      }
    })

    if (!waiting_room_record) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_WRONG_INPUT_EXCEPTION)
      ex.statusCode = 400
      throw ex
    }

    const [requester_clinic_position] = await clinic_position_api.get_records({
      options: {
        filters: {
          clinic_id: waiting_room_record.clinic_id,
          user_id,
          is_admin: true
        }
      }
    })

    if (!requester_clinic_position) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_ADMIN_OF_THE_CLINIC_EX)
      ex.statusCode = 400
      throw ex
    }

    const has_picked_patients =
      await waiting_room_participant_api.get_record_list({
        options: {
          filters: {
            picked_by: target_id
          }
        }
      })

    if (has_picked_patients.length) {
      const ex = new Error(
        EXCEPTION_MESSAGES.CANT_BE_MOVED_HAS_PICKED_PATIENTS_EX
      )
      ex.statusCode = 412
      throw ex
    }

    await doctor_waiting_room_api.upsert_record({
      options: {
        user_id: target_id,
        waiting_room_id: target_room_id
      }
    })

    return {
      success: true
    }
  }

  @Validate((args) => args[0], {
    target_id: 'uuid',
    user_id: 'uuid'
  })
  static async kick_doctor({
    target_id,
    user_id
  }: delete_doctor_from_waiting_room_payload) {
    const { rowCount } = await doctor_waiting_room_api.delete_records({
      options: {
        filters: {
          user_id: target_id
        }
      }
    })

    return {
      success: rowCount > 0
    }
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    clinic_id: {
      type: 'uuid',
      optional: true
    }
  })
  static async get_patient_available_waiting_rooms({
    user_id,
    clinic_id
  }: get_patient_available_waiting_rooms_payload) {
    return waiting_room_api.get_patient_available_waiting_rooms({
      options: {
        clinic_id,
        patient_id: user_id
      }
    })
  }

  @Validate((args) => args[0], {
    user_id: 'uuid'
  })
  static async get_user_waiting_rooms({
    user_id
  }: get_user_waiting_rooms_payload) {
    return waiting_room_participant_api.get_user_waiting_room({
      options: {
        user_id
      }
    })
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    clinic_id: 'uuid',
    value: {
      type: 'boolean',
      convert: true
    }
  })
  static async online_consultation_set_status({
    user_id,
    clinic_id,
    value
  }: set_online_consultation_status_payload) {
    const [requester_clinic_position] = await clinic_position_api.get_records({
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

    await waiting_room_api.online_consultation_set_status({
      options: {
        clinic_id,
        value
      }
    })
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid'
  })
  static async online_consultation_get_status({
    clinic_id
  }: get_online_consultation_status_payload) {
    return await waiting_room_api.online_consultation_get_status({
      options: {
        clinic_id
      }
    })
  }

  @Validate((args) => args[0], {
    waiting_room_ids: {
      type: 'array',
      empty: false
    }
  })
  static async waiting_rooms_by_ids({
    waiting_room_ids
  }: waiting_rooms_by_ids_payload) {
    let in_string: string = ''
    waiting_room_ids.map((wr, index) => {
      if (waiting_room_ids.length - 1 === index) in_string += `${wr}`
      else in_string += `${wr},`
    })

    return await waiting_room_api.waiting_rooms_by_ids({
      options: { waiting_room_ids_string: in_string }
    })
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid'
  })
  static async waiting_rooms_by_clinic({
    clinic_id
  }: waiting_rooms_by_clinic_payload) {
    return await waiting_room_api.waiting_rooms_by_clinic({
      options: { clinic_id }
    })
  }

  @Validate((args) => args[0], {
    waiting_room_id: 'number',
    user_to_ask: 'uuid'
  })
  static async ask_patient({
    waiting_room_id,
    user_to_ask
  }: ask_patient_payload) {
    const data = (await waiting_room_api.ask_patient({
      options: { waiting_room_id, user_to_ask }
    })) as any

    if (data === 404) {
      const error = new Error(EXCEPTION_MESSAGES.ON_NO_PATIENT_AVL_IN_WR)
      error.statusCode = 404
      throw error
    }
    if (data === 400) {
      const error = new Error(EXCEPTION_MESSAGES.ON_PATIENT_ALREADY_REQUESTED)
      error.statusCode = 400
      throw error
    }
    internal_commutator.emit(SUBSCRIPTIONS_TYPES.ON_CALLBACK_SUCCESS, {
      room_id: waiting_room_id,
      user_to_ask
    })
    return data
  }

  @Validate((args) => args[0], {
    waiting_room_id: 'number',
    user_to_remove: 'uuid'
  })
  static async force_remove_patient_from_wr({
    waiting_room_id,
    user_to_remove
  }: force_remove_patient_from_wr_payload) {
    const data = (await waiting_room_api.force_remove_patient_from_wr({
      options: { waiting_room_id, user_to_remove }
    })) as any

    if (data === 404) {
      const error = new Error(EXCEPTION_MESSAGES.ON_NO_PATIENT_AVL_IN_WR)
      error.statusCode = 404
      throw error
    }
    internal_commutator.emit(SUBSCRIPTIONS_TYPES.ON_FORCE_REMOVE, {
      room_id: waiting_room_id,
      room_name: data.waiting_room_name,
      user_to_remove
    })
    return data.rowCount
  }

  @Validate((args) => args[0], {
    interval: {
      type: 'number',
      integer: true,
      positive: true,
      convert: true
    }
  })
  static async get_time_data_post_join_wr({
    interval
  }: get_time_data_post_join_wr_payload) {
    let now = new Date().setMinutes(new Date().getMinutes() + Number(interval))
    return {
      next_ts: new Date(now)
    }
  }

  @Validate((args) => args[0], {
    participants: {
      type: 'array',
      empty: false
    },
    room_id: {
      type: 'number'
    }
  })
  static async add_staff({ room_id, participants }: add_staff_payload) {
    let [waiting_room_data] = await waiting_room_api.get_record_list({
      options: {
        filters: {
          id: room_id
        }
      }
    }),
      clinic_admins = await clinic_position_api.get_records({
        options: {
          filters: {
            clinic_id: waiting_room_data.clinic_id,
            is_admin: true
          }
        }
      })

    if (!waiting_room_data) {
      const error = new Error(EXCEPTION_MESSAGES.ON_INVALID_WR)
      error.statusCode = 400
      throw error
    } else {
      let waiting_users: string[] = [],
        entered_users: string[] = []

      await Promise.all(
        participants.map(async (user_id) => {
          let available_status =
            await doctor_waiting_room_api.get_waiting_room_doctors({
              options: {
                filters: {
                  user_id
                }
              }
            })
          if (available_status.length) {
            const available_room_filtered = available_status.filter(
              ({ waiting_room_id }) => waiting_room_id === room_id
            )
            if (!available_room_filtered.length) {
              clinic_admins.map(async (admin: any) => {
                await clinic_api.create_approved_position_for_wr({
                  options: {
                    clinic_id: waiting_room_data.clinic_id,
                    staff_id: user_id,
                    admin_id: admin.user_id,
                    room_id: room_id
                  }
                })
              })
              internal_commutator.emit(
                SUBSCRIPTIONS_TYPES.ON_DOCTOR_ALREADY_IN_WR,
                {
                  clinic_id: waiting_room_data.clinic_id
                }
              )
              waiting_users.push(user_id)
            }
          } else {
            await doctor_waiting_room_api.upsert_record({
              options: {
                waiting_room_id: room_id,
                user_id
              }
            })
            entered_users.push(user_id)
          }
          return 1
        })
      )
      return { entered_users, waiting_users }
    }
  }

  @Validate((args) => args[0], {
    participants: {
      type: 'array',
      empty: false
    },
    room_id: {
      type: 'number'
    }
  })
  static async remove_staff({ room_id, participants }: remove_staff_payload) {
    const deleted = await Promise.all(
      participants.map(async (user_id) => {
        const { rowCount } = await doctor_waiting_room_api.delete_records({
          options: {
            filters: {
              user_id,
              waiting_room_id: room_id
            }
          }
        })
        return rowCount
      })
    )
    return deleted
  }

  @Validate((args) => args[0], {
    user_id: 'uuid'
  })
  static async doctor_waiting_rooms({
    user_id
  }: doctor_waiting_rooms_payload) {
    return await doctor_waiting_room_api.doctor_waiting_rooms({
      options: { user_id }
    })
  }

  @Validate((args) => args[0], {
    participants: {
      type: 'array',
      empty: false
    },
    room_id: {
      type: 'number',
      integer: true,
      positive: true
    },
    clinic_id: {
      type: 'string',
      format: 'uuid'
    }
  })
  static async create_request({ room_id, participants, user_id, clinic_id }: create_request_payload) {
    let [waiting_room_data] = await waiting_room_api.get_record_list({
      options: {
        filters: {
          id: room_id
        }
      }
    })

    if (!waiting_room_data) {
      const error = new Error(EXCEPTION_MESSAGES.ON_INVALID_WR)
      error.statusCode = 400
      throw error
    }

    await Promise.all(participants.map(async (staff_id: string) => {
      return await waiting_room_api.create_request({
        options: { staff_id, room_id, user_id, clinic_id }
      })
    }));

    return { success: true }
  }


  @Validate((args) => args[0], {
    room_id: {
      type: 'number',
      integer: true,
      positive: true,
      convert: true
    },
    clinic_id: {
      type: 'string',
      format: 'uuid'
    }
  })
  static async request_list({ room_id, clinic_id }: requests_list_payload) {
    let [waiting_room_data] = await waiting_room_api.get_record_list({
      options: {
        filters: {
          id: room_id
        }
      }
    })
    if (!waiting_room_data) {
      const error = new Error(EXCEPTION_MESSAGES.ON_INVALID_WR)
      error.statusCode = 400
      throw error
    }
    const requested_persons_list = await waiting_room_api.requests_list({
      options: { room_id, clinic_id }
    })

    return requested_persons_list && requested_persons_list.rows.length ? requested_persons_list.rows : []
  }

  @Validate((args) => args[0], {
    staff_id: {
      type: 'string',
      format: 'uuid'
    },
    room_id: {
      type: 'number',
      integer: true,
      positive: true
    },
    clinic_id: {
      type: 'string',
      format: 'uuid'
    },
    access_type: {
      type: 'string',
      enum: ["approved", "rejected"]
    }
  })
  static async change_access({ room_id, staff_id, clinic_id, access_type }: change_access_payload) {
    const request = await waiting_room_api.check_request_availability({
      options: { staff_id, room_id, clinic_id }
    }) as any;

    if (!(request.length)) {
      const error = new Error(EXCEPTION_MESSAGES.ON_INVALID_REQUEST);
      error.statusCode = 400;
      throw error;
    }

    if (request.length && request[0].status === access_type) {
      const already_status_error = new Error(`${EXCEPTION_MESSAGES.ON_ALREADY_SAME_STATUS} ${access_type}`);
      already_status_error.statusCode = 400;
      throw already_status_error;
    }

    if (access_type === "approved") {
      const already_in_wr = <any>await doctor_waiting_room_api.get_records({
        options: {
          filters: {
            user_id: staff_id, waiting_room_id: room_id
          }
        }
      });

      if (already_in_wr.length) {
        await doctor_waiting_room_api.upsert_record({
          options: {
            waiting_room_id: room_id,
            user_id: staff_id
          }
        })
      }
    }

    const status_changed = await waiting_room_api.change_access({
      options: { staff_id, room_id, clinic_id, access_type }
    });

    // Sending notifications to staff/doctor
    internal_commutator.emit(SUBSCRIPTIONS_TYPES.ON_REQUEST_STATUS_CHANGE, {
      room_id,
      staff_id,
      clinic_id
    })
    return status_changed.length
  }
}
