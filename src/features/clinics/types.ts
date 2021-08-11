export type get_clinics_in_area_payload = {
  clinic_type_id: number | null
  top_left: {
    latitude: number
    longitude: number
  }
  bottom_right: {
    latitude: number
    longitude: number
  }
  country_id: number
}

export type filters_struct = {
  area?: {
    top_left: {
      latitude: number
      longitude: number
    }
    bottom_right: {
      latitude: number
      longitude: number
    }
  }
  id?: string
  types?: number[]
  search?: string
  country_id?: number
}

export type clinic_payload = {
  clinic_id: number
}

export type get_list_payload = {
  filters: {
    id?: string
    types?: number[]
    search?: string
    clinic_org_code?: string
    country_id?: number
  }
  specializations?: number[]
  limit?: number
  offset?: number
}

export type get_clinic_type_payload = {
  country_id: number
}

enum fhir_type {
  'epic',
  'nhs'
}

enum access_type {
  'read'
}

export type add_fhir_endpoint_payload = {
  clinic_id: string
  fhir_endpoint: string
  username: string
  password: string
  type: fhir_type
  access: access_type
  org_id?: string
}

export type edit_fhir_endpoint_payload = {
  id: number
  clinic_id: string
  fhir_endpoint?: string
  username?: string
  password?: string
  type?: fhir_type
  access?: access_type
  org_id?: string
}

export type delete_fhir_endpoint_payload = {
  id: number
  clinic_id: string
}

export type get_fhir_endpoint_payload = {
  clinic_id: string
}

export type set_clinic_logo_payload = {
  clinic_id: string
  attachment_id: string
}

export type add_clinic_payload = {
  name: string
  country_id: number
  address_id?: number
  phone_id: string
  description?: string
  logo_id?: string
}

export type update_clinic_payload = {
  id: string
  name: string
  country_id: number
  phone_id: string
  description?: string
  logo_id?: string
}

export type set_clinic_buttons_payload = {
  clinic_id: string
  buttons: {
    id: number
    action: any
  }[]
}

export type check_domain_payload = {
  domain_name: string
  clinic_id_or_domain?: string
}

export type set_domain_payload = {
  clinic_id: string
  domain_name?: string
}

export type add_attachment_payload = {
  user_id: string
  clinic_id: string
  attachment_id: string
}

export type delete_attachment_payload = {
  attachment_id: string
}

export type set_decide_payload = {
  attachment_id: string
  user_id: string
  is_approve: boolean
  support_comment?: string
}

export type set_clinic_approve_payload = {
  clinic_id: string
  is_approve: boolean
  user_id: string
}

export type get_attachments_filter_type = {
  attachment_id?: string
  clinic_id?: string
  is_decide?: boolean
  is_approve?: string
}

export type get_attachments_payload = {
  filters?: get_attachments_filter_type
  limit?: number
  offset?: number
}

export type change_status_options_payload = {
  clinic_id: string
  toggle: boolean
}

export type current_general_settings_options_payload = {
  clinic_id: string
}

export type change_clinic_general_settings_payload = {
  clinic_id: string
  body: any
}

export type get_schedules_for_day_payload = {
  schedule_id: number[]
  waiting_room_id?: number
  user_id?: string
  clinic_id: string
  consultation_type: string
  date: string
}

export type check_if_slot_is_available_payload = {
  user_id: string
  waiting_room_id: number
  clinic_id: string
  slot_started: string
  slot_finished: string
  date: string
  event_type: string
}

export type get_doctors_count_in_wr_payload = {
  waiting_room_id: number
}

export type get_clinic_current_ehr_status_payload = {
  clinic_id: string
}

export type change_clinic_ehr_status_payload = {
  clinic_id: string
  toggle: boolean
}

export type create_approved_position_for_wr_payload = {
  clinic_id: string
  staff_id: string
  admin_id: string
  room_id: number
}

export type approve_doctor_for_waiting_room_payload = {
  clinic_id: string
  staff_id: string
  room_id: number
}

export type current_auto_booking_status_payload = {
  clinic_id: string
}

export type waiting_staff_for_waiting_room_payload = {
  clinic_id: string
  room_id: number
  limit?: number
  offset?: number
}

export type remove_waiting_staff_for_waiting_room_payload = {
  participants:[string] 
  room_id: number
}
