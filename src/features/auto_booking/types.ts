export type upsert_record_payload = {
  waiting_room_id: number
  clinic_id: string
  day_of_week: number
  time_from: string
  time_to: string
  clinic_consultation: boolean
  clinic_consultation_duration: string | null, 
  clinic_consultation_price: number
  clinic_consultation_payment_mode: number
  clinic_consultation_clinic_approved: boolean
  online_consultation: boolean
  online_consultation_duration: string | null, 
  online_consultation_price: number
  online_consultation_payment_mode: number
  online_consultation_clinic_approved: boolean
  home_visit: boolean
  home_visit_duration: string | null, 
  home_visit_price: number
  home_visit_payment_mode: number
  home_visit_clinic_approved: boolean
}

export type filters_struct = {
  waiting_room_id?: number
}

export type delete_record_payload = {
  filters: filters_struct
}

export type get_records_payload = {
  filters: filters_struct
}
