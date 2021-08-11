export type upsert_doctor_waiting_room = {
    user_id: string
    waiting_room_id: number
}

export type filters_struct = {
    user_id?: string
    waiting_room_id?: number
}

export type get_records_payload = {
    filters: filters_struct
}

export type delete_records_payload = {
    filters: filters_struct
}

export type get_waiting_room_doctors_payload = {
    filters: filters_struct
}

export type decide_doctors_to_remove_payload = {
    waiting_room_id: number
}

export type doctor_waiting_rooms_payload = {
    user_id: string
}

export type doctor_presence_in_wr_payload = {
    room_id: number
}

export type check_resp_person_payload = {
    room_id: number
    user_id: string
}

export type create_responsible_person_payload = {
    userId?: string
    clinic_id: string
    person_id: string
    room_id: string
    toggle: boolean
}

export type responsible_persons_payload = {
    user_id?: string, 
    clinic_id: string
    room_id: number
}