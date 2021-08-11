export type area_lng_lat_payload = {
  clinic_type_id: number | null
  coordinates: {
    top_left: {
      latitude: number
      longitude: number
    }
    bottom_right: {
      latitude: number
      longitude: number
    }
  }
  user_id: string
  country_iso3_code?: string
}

export type clinic_payload = {
  clinic_id: number
}

export type get_clinics_list = {
  id?: string
  types?: number[]
  search?: string
  specializations?: number[]
  page?: number
  count?: number
  user_id?: string
  country_iso3_code?: string
}

export type get_clinic_type_payload = {
  user_id: string
  country_iso3_code: string
}

export type authorize_clinic_payload = {
  user_id: string
  clinic_id: string
}

export type get_authorized_clinics_payload = {
  user_id: string
}

enum fhir_type {
  'epic',
  'nhs'
}

enum access_type {
  'read'
}

export type add_fhir_endpoint_payload = {
  user_id: string
  fhir_endpoint: string
  username: string
  password: string
  type: fhir_type
  access: access_type
  org_id?: string
}

export type edit_fhir_endpoint_payload = {
  user_id: string
  id: number
  fhir_endpoint?: string
  username?: string
  password?: string
  type?: fhir_type
  access?: access_type
  org_id?: string
}

export type delete_fhir_endpoint_payload = {
  user_id: string
  id: number
}

export type get_fhir_endpoint_payload = {
  user_id: string
}

export type get_clinics_patients = {
  clinic_id: string
  search?: string
  limit?: number
  offset?: number
}

export type get_clinic_patients_total_count = {
  clinic_id: string
  search?: string
}

export type set_clinic_logo_payload = {
  clinic_id: string
  attachment_id: string
  user_id: string
}

type address_payload = {
  zipcode?: string
  state?: string
  city?: string
  building_number?: string
  apartment?: string
  street: string
  latitude: number
  longitude: number
}

type phone_payload = {
  code: string
  number: number
}

export type insert_clinic_payload = {
  name: string
  country_id: number
  address: address_payload
  telephone: phone_payload
  email?: string
  logo_id?: string
  description?: string
  buttons: {
    id: number
    action: any
  }[]
}

export type button_payload = {
  id: number
  action: any
}

export type update_clinic_payload = {
  id: string
  name: string
  country_id: number
  address: address_payload
  telephone: phone_payload
  email?: string
  logo_id?: string
  description?: string
  buttons: button_payload[]
}

export type check_domain_payload = {
  domain_name: string
}

export type add_delete_attachment_payload = {
  user_id: string
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

export type get_attachments_by_clinic_id_payload = {
  user_id: string
  page?: number
  count?: number
}

export type get_attachments_by_sysadmin_payload = {
  clinic_id?: string
  is_decide?: boolean
  is_approve?: string
  page?: number
  count?: number
}

export type auto_booking_change_status_payload = {
  clinic_id: string
  toggle: boolean
}

export type clinic_current_general_settings_payload = {
  clinic_id: string
}

export type general_setting_change_body = {
  set_own_schedule: boolean
  receive_payments_directly: boolean
  set_own_price: boolean
}

export type general_settings_change_payload = {
  clinic_id: string
  body: general_setting_change_body
}

export type get_time_slots_ab_payload = {
  schedule_id: number[]
  clinic_id: string
  user_id: string
  waiting_room_id: number
  consultation_type: string
  date: string
}

export type get_schedules_for_day_return_data = {
  schedule_id: number
  start: Date | string
  finish: Date | string
  start_timestamp: Date | string
  end_timestamp: Date | string
  no_of_slots: number
  interval: number
  clinic_approved: boolean
  payment_type: number
  price: number
}

export type clinic_current_ehr_status_payload = {
  clinic_id: string
}

export type approve_doctor_waiting_room_payload = {
  staff_id: string
  clinic_id: string
  room_id: number
}

export type status_auto_booking_clinic = {
  clinic_id: string
}

export type waiting_staff_for_waiting_room_payload = {
  clinic_id: string
  room_id: number
  limit?: number
  offset?: number
}

export type remove_waiting_staff_for_waiting_room_payload = {
  participants: [string]
  room_id: number
}

export type update_responsible_persons_payload = {
  userId?: string
  clinic_id: string
  person_id: string
  toggle: boolean
  room_id: string
}

export type responsible_persons_payload = {
  userId?: string
  clinic_id: string
  room_id: number
}
