export type insert_record_payload = {
  clinic_id: string
  created_by?: string
  title: string
  avatar_id?: string
  open_from?: string
  open_to?: string
  booking_only?: any
  medical_specializations_id?: number
  per_invitation_only?: boolean
  telephone_id?: string
  email?: string
}

export type filter_struct = {
  id?: number | number[]
  clinic_id?: string
  booking_only?: any
  per_invitation_only?: boolean
  medical_specializations_ids?: number[]
  search?: string
}

export type update_obj_struct = {
  title?: string
  avatar_id?: string | null
  open_from?: string
  open_to?: string
  booking_only?: boolean
  medical_specializations_id?: number
  per_invitation_only?: boolean
  telephone_id?: string | null
  email?: string | null
}

export type get_record_payload = {
  filters: filter_struct
  order_by?: string
  sort_order?: number
  limit?: number
  offset?: number
  medical_specializations_ids?: number[]
  booking_only?: boolean[] | null
}

export type get_record_total_count_payload = {
  filters: filter_struct
}

export type update_record_payload = {
  filters: filter_struct
  update_obj: update_obj_struct
}

export type delete_record_payload = {
  filters: filter_struct
}

export type get_patient_available_waiting_rooms = {
  patient_id: string
  clinic_id?: string
}

export type set_online_consultation_status_payload = {
  clinic_id: string
  value: boolean
}

export type get_online_consultation_status_payload = {
  clinic_id: string
}

export type waiting_rooms_by_ids_payload = {
  waiting_room_ids_string: string
}

export type ask_patient_payload = {
  waiting_room_id: number
  user_to_ask: string
}

export type force_remove_patient_from_wr_payload = {
  waiting_room_id: number
  user_to_remove: string
}

export type waiting_rooms_by_clinic_payload = {
  clinic_id: string
}

export type create_request_payload = {
  staff_id: string 
  room_id: number
  user_id: string
  clinic_id: string
}

export type requests_list_payload = { 
  room_id: number
  clinic_id: string
  staff_id?: string 
}

export type change_access_payload = {
  staff_id: string 
  room_id: number
  access_type: string
  clinic_id: string
}
