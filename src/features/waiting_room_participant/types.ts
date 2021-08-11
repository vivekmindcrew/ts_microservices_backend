export type upsert_record_payload = {
  user_id: string
  room_id: number
  symptoms?: string
  description: string
  body_part_ids: number[]
  next_45_minutes_ts?: Date
  post_45_mins_ts?: Date
}

export type filters_struct = {
  room_id?: number
  user_id?: string
  picked_by?: string | null
}

export type update_obj_struct = {
  picked_by?: string | null
  symptoms?: string
  room_id?: number
}

export type update_record_payload = {
  filters: filters_struct
  update_obj: update_obj_struct
}

export type delete_record_payload = {
  filters: filters_struct
}

export type get_records_payload = {
  filters: filters_struct
  limit?: number
  offset?: number
}

export type get_mapped_records_list_payload = {
  filters: filters_struct
  limit?: number
  offset?: number
}

export type get_user_waiting_rooms_payload = {
  user_id: string
}

export type get_wr_particpant_associated_event_payload = {
  event_id: number
  room_id: number
  participant_id: string
}

export type update_captured_status_for_pick_by_doctor_payload = {
    event_id: number
  }

export type is_access_of_responsible_person_payload = {
  loggedInUser: string
  clinic_id: string
  room_id: string 
} 
