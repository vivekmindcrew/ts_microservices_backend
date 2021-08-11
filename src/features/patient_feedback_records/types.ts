export type upsert_record_payload = {
    user_id: string
    doctor_id: string
    clinic_id: string
    score: number
    feedback: string
}

export type filters_struct = {
    id ? : number
    user_id?: string
    doctor_id? : string
    clinic_id?: string
}

export type delete_records_payload = {
    filters: filters_struct
}

export type get_records_payload = {
    filters: filters_struct
    limit? : number
    offset? : number
}

export type update_obj_payload = {
    feedback_verified ? : boolean
}

export type update_record_payload = {
    filters: filters_struct,
    update_obj : update_obj_payload
}
