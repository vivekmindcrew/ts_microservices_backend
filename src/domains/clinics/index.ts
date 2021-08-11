import { Validate } from '../../etc/helpers'
import { clinic_api } from '../../features/clinics/api'
import { countries_api } from '../../features/countries/api'
import {
  area_lng_lat_payload,
  get_clinics_list,
  get_clinic_type_payload,
  authorize_clinic_payload,
  get_clinics_patients,
  get_authorized_clinics_payload,
  add_fhir_endpoint_payload,
  edit_fhir_endpoint_payload,
  delete_fhir_endpoint_payload,
  get_fhir_endpoint_payload,
  set_clinic_logo_payload,
  button_payload,
  insert_clinic_payload,
  update_clinic_payload,
  get_clinic_patients_total_count,
  check_domain_payload,
  add_delete_attachment_payload,
  set_decide_payload,
  set_clinic_approve_payload,
  get_attachments_by_clinic_id_payload,
  get_attachments_by_sysadmin_payload,
  auto_booking_change_status_payload,
  general_settings_change_payload,
  clinic_current_general_settings_payload,
  get_time_slots_ab_payload,
  get_schedules_for_day_return_data,
  clinic_current_ehr_status_payload,
  approve_doctor_waiting_room_payload,
  status_auto_booking_clinic,
  waiting_staff_for_waiting_room_payload,
  remove_waiting_staff_for_waiting_room_payload,
  update_responsible_persons_payload,
  responsible_persons_payload
} from './types'

import { internal_commutator } from '../../internal_commutator'
import {
  EXCEPTION_MESSAGES,
  CLINIC_SUBDOMAIN_PROPERTY,
  SUBSCRIPTIONS_TYPES
} from '../../constants'
import { users_to_clinics_api } from '../../features/users_to_clinics/api'
import { clinic_position_api } from '../../features/clinic_position/api'
import { doctor_waiting_room_api } from '../../features/doctor_waiting_room'
import get_or_create_telephone_handler from '../../handlers/telephones/get_or_create'
import upsert_address_handler from '../../handlers/address/get_or_create'
import upsert_email_handler from '../../handlers/email/upsert'

export class clinic_lists_domain {
  @Validate((args) => args[0], {
    clinic_type_id: {
      type: 'number',
      convert: true,
      optional: true,
      integer: true,
      positive: true
    },
    coordinates: {
      type: 'object',
      props: {
        top_left: {
          type: 'object',
          props: {
            latitude: {
              type: 'number',
              convert: true,
              min: -90,
              max: 90
            },
            longitude: {
              type: 'number',
              convert: true,
              min: -180,
              max: 180
            }
          }
        },
        bottom_right: {
          type: 'object',
          props: {
            latitude: {
              type: 'number',
              convert: true,
              min: -90,
              max: 90
            },
            longitude: {
              type: 'number',
              convert: true,
              min: -180,
              max: 180
            }
          }
        }
      }
    },
    user_id: 'uuid',
    country_iso3_code: {
      type: 'string',
      optional: true,
      length: 3
    }
  })
  static async get_list_on_area({
    coordinates,
    clinic_type_id,
    user_id,
    country_iso3_code
  }: area_lng_lat_payload) {
    const country = country_iso3_code
      ? await countries_api.get_country_info({
        options: country_iso3_code
      })
      : await countries_api.get_user_country_info({
        options: user_id
      })

    if (!country) {
      const err = new Error(EXCEPTION_MESSAGES.ON_COUNTRY_NOT_FOUND_EX)
      err.statusCode = 412
      throw err
    }

    return clinic_api.get_area_list({
      options: {
        clinic_type_id,
        top_left: coordinates.top_left,
        bottom_right: coordinates.bottom_right,
        country_id: country.id
      }
    })
  }

  @Validate((args) => args[0], {
    id: {
      type: 'string',
      optional: true
    },
    types: {
      type: 'array',
      items: 'number',
      optional: true
    },
    specializations: {
      type: 'array',
      items: 'number',
      optional: true
    },
    search: {
      type: 'string',
      optional: true
    },
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
    user_id: {
      type: 'uuid',
      optional: true
    },
    country_iso3_code: {
      type: 'string',
      optional: true,
      length: 3
    }
  })
  static async get_clinics_list({
    types,
    specializations,
    search,
    page,
    count,
    id,
    user_id,
    country_iso3_code
  }: get_clinics_list) {
    const country = country_iso3_code
      ? await countries_api.get_country_info({
        options: country_iso3_code
      })
      : user_id
        ? await countries_api.get_user_country_info({
          options: user_id
        })
        : undefined

    if (user_id && !country) {
      const err = new Error(EXCEPTION_MESSAGES.ON_COUNTRY_NOT_FOUND_EX)
      err.statusCode = 412
      throw err
    }

    return clinic_api.get_list({
      options: {
        filters: {
          search,
          types,
          id,
          country_id: country ? country.id : undefined
        },
        specializations,
        limit: count ? count : undefined,
        offset: count && page ? count * (page - 1) : 0
      }
    })
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    country_iso3_code: {
      type: 'string',
      optional: true,
      length: 3
    }
  })
  static async get_clinic_types({
    user_id,
    country_iso3_code
  }: get_clinic_type_payload) {
    const country = country_iso3_code
      ? await countries_api.get_country_info({
        options: country_iso3_code
      })
      : await countries_api.get_user_country_info({
        options: user_id
      })
    if (!country) {
      const err = new Error(EXCEPTION_MESSAGES.ON_COUNTRY_NOT_FOUND_EX)
      err.statusCode = 412
      throw err
    }

    return clinic_api.get_clinic_types({
      options: {
        country_id: country.id
      }
    })
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    clinic_id: 'uuid'
  })
  static async authorize_clinic({
    clinic_id,
    user_id
  }: authorize_clinic_payload) {
    await users_to_clinics_api.create_record({
      options: {
        clinic_id,
        user_id
      }
    })

    return {
      success: true
    }
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    clinic_id: 'uuid'
  })
  static async remove_authorize_clinic({
    clinic_id,
    user_id
  }: authorize_clinic_payload) {
    return await users_to_clinics_api.delete_record({
      options: {
        clinic_id,
        user_id
      }
    })
  }

  @Validate((args) => args[0], {
    user_id: 'uuid'
  })
  static async get_authorized_clinics({
    user_id
  }: get_authorized_clinics_payload) {
    return users_to_clinics_api.get_list({
      options: {
        user_id
      }
    })
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    fhir_endpoint: 'url',
    username: 'string',
    password: 'string',
    type: {
      type: 'string',
      enum: ['epic', 'nhs']
    },
    access: {
      type: 'string',
      enum: ['read']
    },
    org_id: {
      type: 'string',
      optional: true
    }
  })
  static async add_fhir_endpoint(parameters: add_fhir_endpoint_payload) {
    const [requester_clinic_position] = await clinic_position_api.get_records({
      options: {
        filters: {
          user_id: parameters.user_id,
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

    await clinic_api.add_fhir_endpoint({
      options: {
        ...parameters,
        clinic_id: requester_clinic_position.clinic_id
      }
    })
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    id: {
      type: 'number',
      integer: true,
      positive: true,
      convert: true
    },
    fhir_endpoint: {
      type: 'url',
      optional: true
    },
    username: {
      type: 'string',
      optional: true
    },
    password: {
      type: 'string',
      optional: true
    },
    type: {
      type: 'string',
      enum: ['epic', 'nhs'],
      optional: true
    },
    access: {
      type: 'string',
      enum: ['read'],
      optional: true
    },
    org_id: {
      type: 'string',
      optional: true
    }
  })
  static async edit_fhir_endpoint(parameters: edit_fhir_endpoint_payload) {
    if (
      (parameters.username && !parameters.password) ||
      (!parameters.username && parameters.password)
    ) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_FAILED_LOGIN_PASS_FHIR)
      ex.statusCode = 400
      throw ex
    }

    const [requester_clinic_position] = await clinic_position_api.get_records({
      options: {
        filters: {
          user_id: parameters.user_id,
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

    await clinic_api.edit_fhir_endpoint({
      options: {
        ...parameters,
        clinic_id: requester_clinic_position.clinic_id
      }
    })
  }

  @Validate((args) => args[0], {
    id: {
      type: 'number',
      integer: true,
      positive: true,
      convert: true
    },
    user_id: 'uuid'
  })
  static async delete_fhir_endpoint(parameters: delete_fhir_endpoint_payload) {
    const [requester_clinic_position] = await clinic_position_api.get_records({
      options: {
        filters: {
          user_id: parameters.user_id,
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

    await clinic_api.delete_fhir_endpoint({
      options: {
        id: parameters.id,
        clinic_id: requester_clinic_position.clinic_id
      }
    })
  }

  @Validate((args) => args[0], {
    user_id: 'uuid'
  })
  static async get_fhir_endpoints(parameters: get_fhir_endpoint_payload) {
    const [requester_clinic_position] = await clinic_position_api.get_records({
      options: {
        filters: {
          user_id: parameters.user_id,
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

    return await clinic_api.get_fhir_endpoints({
      options: {
        clinic_id: requester_clinic_position.clinic_id
      }
    })
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid',
    search: {
      type: 'string',
      optional: true
    },
    limit: {
      type: 'number',
      optional: true
    },
    offset: {
      type: 'number',
      optional: true
    }
  })
  static async get_clinic_patients_list({
    clinic_id,
    limit,
    offset,
    search
  }: get_clinics_patients) {
    return users_to_clinics_api.get_clinic_patients({
      options: {
        clinic_id,
        limit,
        offset,
        search
      }
    })
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid',
    search: {
      type: 'string',
      optional: true
    }
  })
  static async get_clinic_patients_total_count({
    clinic_id,
    search
  }: get_clinic_patients_total_count) {
    return users_to_clinics_api.get_clinic_patients_total_count({
      options: {
        clinic_id,
        search
      }
    })
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid',
    attachment_id: 'uuid',
    user_id: 'uuid'
  })
  static async set_clinic_logo({
    clinic_id,
    attachment_id,
    user_id
  }: set_clinic_logo_payload) {
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

    await clinic_api.set_clinic_logo({
      options: {
        clinic_id,
        attachment_id
      }
    })
  }

  @Validate((args) => args[0], {
    name: 'string',
    country_id: 'number',
    email: {
      type: 'email',
      optional: true
    },
    description: {
      type: 'string',
      optional: true
    },
    logo_id: {
      type: 'uuid',
      optional: true
    },
    telephone: {
      type: 'object',
      props: {
        code: 'string',
        number: {
          type: 'number',
          convert: true
        }
      }
    },
    address: {
      type: 'object',
      props: {
        zipcode: {
          type: 'string',
          optional: true
        },
        state: {
          type: 'string',
          optional: true
        },
        city: {
          type: 'string',
          optional: true
        },
        building_number: {
          type: 'string',
          optional: true
        },
        apartment: {
          type: 'string',
          optional: true
        },
        street: 'string',
        latitude: {
          type: 'number',
          convert: true,
          min: -90,
          max: 90
        },
        longitude: {
          type: 'number',
          convert: true,
          min: -180,
          max: 180
        }
      }
    },
    buttons: {
      type: 'array',
      items: {
        type: 'object',
        props: {
          id: {
            type: 'number',
            convert: 'true'
          },
          action: 'object'
        }
      }
    }
  })
  static async insert_clinic({
    name,
    country_id,
    address,
    telephone,
    email,
    description,
    logo_id,
    buttons
  }: insert_clinic_payload) {
    const { domain_name } = await this.domain_verification(buttons)

    const [telephone_id, address_record] = await Promise.all([
      get_or_create_telephone_handler({
        payload: {
          code: `+${telephone.code.replace('+', '')}`,
          number: +telephone.number
        }
      }),
      upsert_address_handler({
        options: {
          country_id,
          zipcode: address.zipcode,
          state: address.state,
          city: address.city,
          buildingNumber: address.building_number,
          apartment: address.apartment,
          street: address.street,
          latitude: address.latitude,
          longitude: address.longitude
        }
      })
    ])

    if (!telephone_id || telephone_id === null) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_NUMBER_IS_NOT_VALID_EX)
      ex.statusCode = 412
      throw ex
    }

    if (!address_record || !address_record.id) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_ADDRESS_SAVING_EX)
      ex.statusCode = 412
      throw ex
    }

    const clinic_record = await clinic_api.add_new_clinic({
      options: {
        name,
        country_id,
        address_id: address_record.id,
        phone_id: telephone_id,
        logo_id,
        description
      }
    })

    if (!clinic_record || !clinic_record.id) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_CLINIC_SAVING_EX)
      ex.statusCode = 412
      throw ex
    }

    await Promise.all([
      upsert_email_handler({
        options: {
          clinic_id: clinic_record.id,
          email
        }
      }),
      clinic_api.set_clinic_buttons({
        options: {
          clinic_id: clinic_record.id,
          buttons
        }
      }),
      clinic_api.set_domain({
        options: {
          clinic_id: clinic_record.id,
          domain_name
        }
      })
    ])

    return {
      id: clinic_record.id
    }
  }

  @Validate((args) => args[0], {
    id: 'string',
    name: 'string',
    country_id: 'number',
    email: {
      type: 'email',
      optional: true
    },
    description: {
      type: 'string',
      optional: true
    },
    logo_id: {
      type: 'uuid',
      optional: true
    },
    telephone: {
      type: 'object',
      props: {
        code: 'string',
        number: {
          type: 'number',
          convert: true
        }
      }
    },
    address: {
      type: 'object',
      props: {
        zipcode: {
          type: 'string',
          optional: true
        },
        state: {
          type: 'string',
          optional: true
        },
        city: {
          type: 'string',
          optional: true
        },
        building_number: {
          type: 'string',
          optional: true
        },
        apartment: {
          type: 'string',
          optional: true
        },
        street: 'string',
        latitude: {
          type: 'number',
          convert: true,
          min: -90,
          max: 90
        },
        longitude: {
          type: 'number',
          convert: true,
          min: -180,
          max: 180
        }
      }
    },
    buttons: {
      type: 'array',
      items: {
        type: 'object',
        props: {
          id: {
            type: 'number',
            convert: 'true'
          },
          action: 'object'
        }
      }
    }
  })
  static async update_clinic({
    id,
    name,
    country_id,
    address,
    telephone,
    email,
    description,
    logo_id,
    buttons
  }: update_clinic_payload) {
    const { domain_name } = await this.domain_verification(buttons, id)

    const telephone_id = await get_or_create_telephone_handler({
      payload: {
        code: `+${telephone.code.replace('+', '')}`,
        number: +telephone.number
      }
    })

    if (!telephone_id || telephone_id === null) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_NUMBER_IS_NOT_VALID_EX)
      ex.statusCode = 412
      throw ex
    }

    const clinic_record = await clinic_api.update_clinic({
      options: {
        id,
        name,
        country_id,
        phone_id: telephone_id,
        logo_id,
        description
      }
    })

    if (
      !clinic_record ||
      !clinic_record.addressId ||
      clinic_record.addressId === null
    ) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_CLINIC_NOT_FOUND_EX)
      ex.statusCode = 412
      throw ex
    }

    await Promise.all([
      upsert_address_handler({
        options: {
          id: clinic_record.addressId,
          country_id,
          zipcode: address.zipcode,
          state: address.state,
          city: address.city,
          buildingNumber: address.building_number,
          apartment: address.apartment,
          street: address.street,
          latitude: address.latitude,
          longitude: address.longitude
        }
      }),
      upsert_email_handler({
        options: {
          clinic_id: clinic_record.id,
          email
        }
      }),
      clinic_api.set_clinic_buttons({
        options: {
          clinic_id: clinic_record.id,
          buttons
        }
      }),
      clinic_api.set_domain({
        options: {
          clinic_id: clinic_record.id,
          domain_name
        }
      })
    ])
  }

  static async get_clinic_buttons() {
    return await clinic_api.get_clinic_buttons()
  }

  @Validate((args) => args[0], {
    domain_name: 'string'
  })
  static async check_domain({ domain_name }: check_domain_payload) {
    return await clinic_api.check_domain({ options: { domain_name } })
  }

  static domain_verification = async (
    buttons: button_payload[],
    clinic_id_or_domain?: string
  ) => {
    let domain_name: string | undefined
    if (buttons.length === 0) return { domain_name }

    const button_id: number = await clinic_api.get_id_domain_button()
    const button = buttons.find((item) => item.id === button_id)
    if (!button || !button.action[CLINIC_SUBDOMAIN_PROPERTY])
      return { domain_name }

    await clinic_api.check_domain({
      options: {
        domain_name: button.action[CLINIC_SUBDOMAIN_PROPERTY],
        clinic_id_or_domain
      }
    })

    return { domain_name: button.action[CLINIC_SUBDOMAIN_PROPERTY] }
  }

  @Validate((args) => args[0], {
    attachment_id: 'uuid',
    user_id: 'uuid'
  })
  static async add_attachment({
    attachment_id,
    user_id
  }: add_delete_attachment_payload) {
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

    const record = await clinic_api.add_attachment({
      options: {
        attachment_id,
        user_id,
        clinic_id: requester_clinic_position.clinic_id
      }
    })

    if (record)
      internal_commutator.emit(SUBSCRIPTIONS_TYPES.ON_NEW_CLINIC_ATTACHMENT, {
        attachment_id,
        clinic_id: requester_clinic_position.clinic_id
      })
  }

  @Validate((args) => args[0], {
    attachment_id: 'uuid',
    user_id: 'uuid'
  })
  static async delete_attachment({
    attachment_id,
    user_id
  }: add_delete_attachment_payload) {
    const attachment_record = await clinic_api.get_attachments({
      options: {
        filters: {
          attachment_id
        }
      }
    })

    if (!attachment_record.length) return

    if (attachment_record[0].is_approve) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_DELETE_APPROVED_DOC_EX)
      ex.statusCode = 400
      throw ex
    }

    const [requester_clinic_position] = await clinic_position_api.get_records({
      options: {
        filters: {
          user_id,
          clinic_id: attachment_record[0].clinic.id,
          is_admin: true
        }
      }
    })
    if (!requester_clinic_position) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_ADMIN_OF_THE_CLINIC_EX)
      ex.statusCode = 400
      throw ex
    }

    await clinic_api.delete_attachment({
      options: {
        attachment_id
      }
    })
  }

  @Validate((args) => args[0], {
    attachment_id: 'uuid',
    user_id: 'uuid',
    is_approve: {
      type: 'boolean',
      convert: true
    },
    support_comment: {
      type: 'string',
      optional: true
    }
  })
  static async set_decide({
    attachment_id,
    user_id,
    is_approve,
    support_comment
  }: set_decide_payload) {
    const record = await clinic_api.set_decide({
      options: {
        attachment_id,
        user_id,
        is_approve,
        support_comment
      }
    })

    if (record)
      internal_commutator.emit(
        SUBSCRIPTIONS_TYPES.ON_CLINIC_ATTACHMENT_DECIDE,
        {
          attachment_id: record.attachment_id
        }
      )
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid',
    user_id: 'uuid',
    is_approve: {
      type: 'boolean',
      convert: true
    }
  })
  static async set_clinic_approve({
    clinic_id,
    user_id,
    is_approve
  }: set_clinic_approve_payload) {
    const record = await clinic_api.set_clinic_approve({
      options: {
        clinic_id,
        user_id,
        is_approve
      }
    })

    if (record)
      internal_commutator.emit(SUBSCRIPTIONS_TYPES.ON_CLINIC_DECIDE, {
        clinic_id
      })
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    page: {
      type: 'number',
      convert: true,
      optional: true
    },
    count: {
      type: 'number',
      convert: true,
      optional: true
    }
  })
  static async get_attachments_by_clinic_id({
    user_id,
    page,
    count
  }: get_attachments_by_clinic_id_payload) {
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

    return await clinic_api.get_attachments({
      options: {
        filters: {
          clinic_id: requester_clinic_position.clinic_id
        },
        limit: count ? count : undefined,
        offset: count && page ? count * (page - 1) : 0
      }
    })
  }

  @Validate((args) => args[0], {
    clinic_id: {
      type: 'uuid',
      optional: true
    },
    is_deside: {
      type: 'boolean',
      convert: true,
      optional: true
    },
    is_approve: {
      type: 'boolean',
      convert: true,
      optional: true
    },
    page: {
      type: 'number',
      convert: true,
      optional: true
    },
    count: {
      type: 'number',
      convert: true,
      optional: true
    }
  })
  static async get_attachments_by_sysadmin({
    clinic_id,
    is_approve,
    is_decide,
    page,
    count
  }: get_attachments_by_sysadmin_payload) {
    return await clinic_api.get_attachments({
      options: {
        filters: {
          clinic_id,
          is_decide,
          is_approve
        },
        limit: count ? count : undefined,
        offset: count && page ? count * (page - 1) : 0
      }
    })
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid'
  })
  static async current_auto_booking_status({
    clinic_id
  }: status_auto_booking_clinic) {
    return clinic_api.current_auto_booking_status({
      options: { clinic_id }
    })
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid',
    toggle: {
      type: 'boolean',
      convert: true
    }
  })
  static async change_auto_booking_status({
    clinic_id,
    toggle
  }: auto_booking_change_status_payload) {
    return clinic_api.change_auto_booking_status({
      options: { clinic_id, toggle }
    })
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid'
  })
  static async current_clinic_general_settings({
    clinic_id
  }: clinic_current_general_settings_payload) {
    return clinic_api.current_clinic_general_settings({
      options: { clinic_id }
    })
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid',
    set_own_schedule: {
      type: 'boolean',
      convert: true
    },
    receive_payments_directly: {
      type: 'boolean',
      convert: true
    },
    set_own_price: {
      type: 'boolean',
      convert: true
    }
  })
  static async change_clinic_general_settings({
    clinic_id,
    body
  }: general_settings_change_payload) {
    return clinic_api.change_clinic_general_settings({
      options: { clinic_id, body }
    })
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid',
    schedule_id: {
      type: 'array',
      items: 'number',
      empty: false
    },
    waiting_room_id: {
      type: 'number',
      optional: true
    },
    user_id: {
      type: 'uuid',
      optional: true
    },
    date: {
      type: 'string'
    },
    consultation_type: {
      type: 'string',
      enum: ['ONLINE_CONSULTATION', 'CLINIC_CONSULTATION', 'HOME_VISIT']
    }
  })
  static async get_clinic_time_slots({
    schedule_id,
    waiting_room_id,
    user_id,
    clinic_id,
    consultation_type,
    date
  }: get_time_slots_ab_payload) {
    let get_schedules_for_day = (await clinic_api.get_schedules_for_day({
      options: {
        schedule_id,
        waiting_room_id,
        user_id,
        clinic_id,
        consultation_type,
        date
      }
    })) as any,
      rowCount = 0,
      available_array: {}[] = []

    if (Array.isArray(get_schedules_for_day) && get_schedules_for_day.length) {
      if (waiting_room_id) {
        let get_doctors_count = await clinic_api.get_doctors_count_in_wr({
          options: { waiting_room_id }
        })
        rowCount = get_doctors_count.rowCount
      }

      get_schedules_for_day = await Promise.all(
        get_schedules_for_day.map(
          async (schedule: get_schedules_for_day_return_data) => {
            let {
              no_of_slots,
              clinic_approved,
              start,
              start_timestamp,
              interval,
              schedule_id
            } = schedule,
              temp_array: number[] = [],
              payment_type = 0,
              price = 0,
              payment_type_name = 'free',
              paid_slot = false

            if (no_of_slots > 0) {
              if ('payment_type' in schedule && schedule.payment_type > 0) {
                payment_type = schedule.payment_type
                switch (payment_type) {
                  case 1:
                    payment_type_name = 'online'
                    break
                  case 2:
                    payment_type_name = 'at_clinic'
                    break
                }
                paid_slot = true
              }

              if ('price' in schedule && schedule.price > 0) {
                price = schedule.price
              }

              for (let index = 1; index <= no_of_slots; index++)
                temp_array.push(index)

              for await (const iterator of temp_array) {
                start_timestamp = new Date(start_timestamp)
                start = new Date(start_timestamp)
                start_timestamp.setMinutes(
                  start_timestamp.getMinutes() + interval
                )

                const end = new Date(start_timestamp),
                  obj = {
                    time_from: `${start.getHours().toString().length < 2
                      ? '0' + start.getHours()
                      : start.getHours()
                      }:${start.getMinutes().toString().length < 2
                        ? '0' + start.getMinutes()
                        : start.getMinutes()
                      }`,
                    time_to: `${end.getHours().toString().length < 2
                      ? '0' + end.getHours()
                      : end.getHours()
                      }:${end.getMinutes().toString().length < 2
                        ? '0' + end.getMinutes()
                        : end.getMinutes()
                      }`,
                    paid_slot: paid_slot,
                    payment_mode_name: payment_type_name,
                    payment_mode: payment_type,
                    price: Number(price),
                    clinic_approved: clinic_approved,
                    available_slots: 1,
                    allocated_slots: 0,
                    available: true,
                    duration: interval,
                    schedule_id
                  } as any

                switch (consultation_type) {
                  case 'ONLINE_CONSULTATION':
                    consultation_type = 'CALL'
                    break
                  case 'CLINIC_CONSULTATION':
                    consultation_type = 'CONSULTATION'
                    break
                  case 'HOME_VISIT':
                    consultation_type = 'HOME_VISIT'
                    break
                }

                const check = await clinic_api.check_if_slot_is_available({
                  options: {
                    user_id,
                    clinic_id,
                    waiting_room_id,
                    slot_started: `${start.getHours().toString().length < 2
                      ? '0' + start.getHours()
                      : start.getHours()
                      }:${start.getMinutes().toString().length < 2
                        ? '0' + start.getMinutes()
                        : start.getMinutes()
                      }:${start.getSeconds().toString().length < 2
                        ? '0' + start.getSeconds()
                        : start.getSeconds()
                      }`,
                    slot_finished: `${end.getHours().toString().length < 2
                      ? '0' + end.getHours()
                      : end.getHours()
                      }:${end.getMinutes().toString().length < 2
                        ? '0' + end.getMinutes()
                        : end.getMinutes()
                      }:${end.getSeconds().toString().length < 2
                        ? '0' + end.getSeconds()
                        : end.getSeconds()
                      }`,
                    date,
                    event_type: consultation_type
                  }
                })

                if (waiting_room_id) {
                  if (
                    rowCount > 1 &&
                    !check.length &&
                    check.length < rowCount
                  ) {
                    obj.available_slots = Math.abs(check.length - rowCount)
                    obj.allocated_slots = Math.abs(
                      rowCount - Math.abs(check.length - rowCount)
                    )
                  } else if (!check.length) {
                    obj.available_slots = 1
                    obj.allocated_slots = 0
                    obj.available = true
                  } else {
                    obj.available_slots = 0
                    obj.allocated_slots = rowCount
                    obj.available = false
                  }
                } else {
                  if (check.length > 0) {
                    obj.available_slots = 0
                    obj.allocated_slots = 1
                    obj.available = false
                  }
                }
                available_array.push(obj)
                start_timestamp = end
              }
            }
            return available_array
          }
        )
      )
    }
    return get_schedules_for_day
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid'
  })
  static async get_clinic_current_ehr_status({
    clinic_id
  }: clinic_current_ehr_status_payload) {
    return clinic_api.get_clinic_current_ehr_status({
      options: { clinic_id }
    })
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid',
    toggle: {
      type: 'boolean',
      convert: true
    }
  })
  static async change_clinic_ehr_status({
    clinic_id,
    toggle
  }: auto_booking_change_status_payload) {
    return clinic_api.change_clinic_ehr_status({
      options: { clinic_id, toggle }
    })
  }

  @Validate((args) => args[0], {
    user_id: 'uuid',
    clinic_id: 'uuid',
    staff_id: 'uuid',
    room_id: 'number'
  })
  static async approve_doctor_for_waiting_room({
    staff_id,
    clinic_id,
    room_id
  }: approve_doctor_waiting_room_payload) {
    let insert_doctor_to_wr
    await clinic_api.approve_doctor_for_waiting_room({
      options: { staff_id, clinic_id, room_id }
    })

    const check_for_existing_doctors =
      (await doctor_waiting_room_api.get_records({
        options: {
          filters: { user_id: staff_id, waiting_room_id: room_id }
        }
      })) as any

    if (check_for_existing_doctors && !check_for_existing_doctors.length) {
      insert_doctor_to_wr = await doctor_waiting_room_api.upsert_record({
        options: { user_id: staff_id, waiting_room_id: room_id }
      })
    }
    return { status: 'success' }
  }

  @Validate((args) => args[0], {
    clinic_id: 'uuid',
    room_id: {
      type: 'number',
      integer: true,
      positive: true,
      convert: true
    },
    limit: {
      type: 'number',
      integer: true,
      positive: true,
      convert: true,
      optional: true
    },
    offset: {
      type: 'number',
      integer: true,
      convert: true,
      optional: true
    }
  })
  static async waiting_staff_for_waiting_room({
    clinic_id,
    room_id,
    limit,
    offset
  }: waiting_staff_for_waiting_room_payload) {
    let options_object: any = { clinic_id, room_id }
    if (limit && offset) options_object.limit = limit
    options_object.offset = offset
    return await clinic_api.waiting_staff_for_waiting_room({
      options: options_object
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
    }
  })
  static async remove_waiting_staff_for_waiting_room({
    participants,
    room_id
  }: remove_waiting_staff_for_waiting_room_payload) {
    return await clinic_api.remove_waiting_staff_for_waiting_room({
      options: { participants, room_id }
    })
  }

  @Validate((args) => args[0], {
    userId: {
      type: 'uuid',
      optional: true
    },
    clinic_id: 'uuid',
    person_id: 'uuid',
    toggle: {
      type: 'boolean',
      convert: true
    }
  })
  static async update_responsible_persons({
    userId,
    clinic_id,
    person_id,
    toggle,
    room_id
  }: update_responsible_persons_payload) {
    return await doctor_waiting_room_api.update_responsible_persons({
      options: {
        userId,
        clinic_id,
        person_id,
        toggle,
        room_id
      }
    }) as any;
  }

  @Validate((args) => args[0], {
    room_id: {
      type: 'number',
      convert: true
    },
    clinic_id: 'uuid'
  })
  static async responsible_persons({
    userId,
    clinic_id,
    room_id
  }: responsible_persons_payload) {
    return await doctor_waiting_room_api.responsible_persons({
      options: {
        user_id: userId,
        clinic_id,
        room_id
      }
    }) as any;
  }
}
