export type create_clinic_specialization_payload = {
  user_id: string
  clinic_id: string
  medical_specialization_id?: number
  medical_level_id?: number
  certificate: {
    attachment_id: string
    certificate_number?: string
  }
  shifts?: {
    days: number[]
    start: string
    finish: string
    consultation_slot?: {
      from: string
      to: string
      time_slot: number
      payment_mode: number
      price: number
    }
    home_visit_slot: {
      from: string
      to: string
      time_slot: number
      payment_mode: number
      price: number
    }
    online_slot: {
      from: string
      to: string
      time_slot: number
      payment_mode: number
      price: number
    }
  }[]
  corporate_email?: string
  corporate_phone?: {
    code: string
    number: number
  }
  chat_allowed?: boolean
  audio_call_allowed?: boolean
  contact_directly_allowed?: boolean
  video_call_allowed?: boolean
  department_id?: number
  sub_role_id?: number
}

export type rebase_clinic_specialization_payload = {
  filter: {
    clinic_id: string
    medical_specialization_id: number
  }
  user_id: string
  clinic_id: string
  medical_specialization_id?: number
  medical_level_id?: number
  shifts: {
    days: number[]
    start: string
    finish: string
    consultation_slot?: {
      from: string
      to: string
      time_slot: number
    }
    home_visit_slot: {
      from: string
      to: string
      time_slot: number
    }
    online_slot: {
      from: string
      to: string
      time_slot: number
    }
  }[]
  corporate_email?: string
  corporate_phone?: {
    code: string
    number: number
  }
  chat_allowed?: boolean
  audio_call_allowed?: boolean
  contact_directly_allowed?: boolean
  video_call_allowed?: boolean
  certificate: {
    attachment_id: string
    certificate_number?: string
  }
  department_id?: number
  sub_role_id?: number
}

export type switch_active_clinic_payload = {
  user_id: string
  clinic_id: string
}

export type change_clinic_admin_payload = {
  user_id: string
  clinic_id: string
  new_admin_id: string
}

export type verify_clinic_member = {
  user_id: string
  clinic_id: string
  user_to_verify_id: string
}

export type leave_clinic_payload = {
  user_id: string
  clinic_id: string
  medical_specialization_id: number
}

export type get_user_specializations_payload = {
  user_id: string
  clinic_id?: string
  medical_specialization_id?: number
}

export type get_clinic_professionals_payload = {
  clinic_id: string
  page?: number
  count?: number
  search?: string
  medical_specialization_ids?: number[]
  rating_from?: number
  rating_to?: number
}

export type get_time_slots_payload = {
  doctor_id: string
  clinic_id: string
  date: string
  type: 'CONSULTATION' | 'HOME_VISIT' | 'CALL'
}

export type change_department_payload = {
  user_id: string
  doctor_id?: string
  department_id: number
}

export type doctors_by_clinic_payload = {
  clinic_id: string
  userId: string
}
