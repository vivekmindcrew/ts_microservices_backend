export type interval_payload = {
    day: number,
    hour: number,
    minute: number
}

export type get_shifts_for_day_payload = {
    type: 'CONSULTATION' | 'HOME_VISIT' | 'CALL' | 'CLINIC_CONSULTATION' | 'ONLINE_CONSULTATION'
    user_id: string
    clinic_id: string
    day: number
}

export type get_time_slots = {
    user_id: string
    clinic_id: string
    date: string
    start: string
    finish: string,
    time_slot_interval: number
}

export type create_record_payload = {
    user_id: string,
    clinic_id: string,
    medical_specialization_id?: number,
    start: interval_payload,
    finish: interval_payload,
    consultation_slot_from?: interval_payload,
    consultation_slot_to?: interval_payload,
    consultation_slot_interval?: number
    home_visit_slot_from?: interval_payload,
    home_visit_slot_to?: interval_payload,
    home_visit_slot_interval?: number,
    online_slot_from?: interval_payload,
    online_slot_to?: interval_payload,
    online_slot_interval?: number,
    stack_id: number
}
