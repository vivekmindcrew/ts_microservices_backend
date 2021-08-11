export type type_struct = {
  duration: string
  price: number
  payment_mode: number
  clinic_approved: boolean
}

export type create_waiting_room_payload = {
  user_id: string
  clinic_id: string
  title: string
  avatar_id?: string
  open_from?: string
  open_to?: string
  booking_only?: boolean
  medical_specializations_id?: number
  per_invitation_only?: boolean
  schedules?: {
    day_of_week: number
    time_from: string
    time_to: string
    clinic_consultation?: type_struct
    online_consultation?: type_struct
    home_visit?: type_struct
  }[]
  telephone?: string
  email?: string,
  participant_doctors?: string[]
}

export type get_waiting_rooms_list_payload = {
  id?: number
  clinic_id: string
  limit?: number
  offset?: number
  medical_specializations_ids?: number[]
  booking_only?: any
  search: string
  order_by?: string
  sort_order?: number
  open?: boolean
}

export type update_waiting_room_payload = {
  id: number
  user_id: string
  title: string
  avatar_id?: string | null
  open_from?: string
  open_to?: string
  booking_only?: boolean
  medical_specializations_id?: number
  per_invitation_only?: boolean
  schedules: {
    day_of_week: number
    time_from: string
    time_to: string
    clinic_consultation?: type_struct
    online_consultation?: type_struct
    home_visit?: type_struct
  }[]
  telephone?: string | null
  email?: string | null
  participant_doctors?: string[]
}

export type delete_record_payload = {
  user_id: string
  id: number
}

export type join_waiting_room_payload = {
  user_id: string
  room_id: number
  symptoms: string
  description: string
  body_part_ids: number[],
  patient_id?:  string,
  role? : string
}

export type leave_waiting_room_payload = {
  user_id: string
  room_id: number
  patient_id?:  string
  role: string
}

export type get_group_participants_payload = {
  user_id: string
  room_id: number
  limit?: number
  offset?: number
}

export type pick_participant_from_queue_payload = {
  user_id: string
  room_id: number
  target_id: string
  event_id: number
  auth_token: string
  role: string
}

export type release_patient_payload = {
  user_id: string
  room_id: number
  target_id: string
}

export type refer_patient_payload = {
  user_id: string
  target_id: string
  room_id: number
  target_room_id: number
}

export type doctor_check_in_waiting_room_payload = {
  user_id: string
  room_id: number
}

export type get_doctor_waiting_room_payload = {
  user_id: string
}

export type check_out_from_waiting_room_payload = {
  user_id: string
}

export type get_waiting_room_doctors_payload = {
  room_id: number
}

export type move_doctor_to_waiting_room_payload = {
  user_id: string
  target_room_id: number
  target_id: string
}

export type delete_doctor_from_waiting_room_payload = {
  user_id: string
  target_id: string
}

export type get_patient_available_waiting_rooms_payload = {
  user_id: string
  clinic_id?: string
}

export type get_user_waiting_rooms_payload = {
  user_id: string
}

export type set_online_consultation_status_payload = {
  user_id: string
  clinic_id: string
  value: boolean
}

export type get_online_consultation_status_payload = {
  clinic_id: string
}

export type waiting_rooms_by_ids_payload = {
  waiting_room_ids: number[]
  userId?: string
}

export type waiting_rooms_by_clinic_payload = {
  clinic_id: string
  userId?: string
}

export type ask_patient_payload = {
  waiting_room_id: number
  user_to_ask: string
}

export type force_remove_patient_from_wr_payload = {
  waiting_room_id: number
  user_to_remove: string
}

export type get_time_data_post_join_wr_payload = { interval: number }

export type add_staff_payload = {
  room_id: number
  participants: string[]
}

export type remove_staff_payload = {
  room_id: number
  participants: string[]
}

export type doctor_waiting_rooms_payload = {
  user_id: string
}

export type create_request_payload = {
  participants: string[] 
  room_id: number
  user_id: string
  clinic_id: string
}

export type requests_list_payload = {
  room_id: number
  clinic_id: string
}

export type change_access_payload = {
  staff_id: string 
  room_id: number
  access_type: string
  clinic_id: string
}