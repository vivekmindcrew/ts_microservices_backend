export type upsert_record_payload = {
    user_id: string
    clinic_id: string
}

export type filters_struct = {
    user_id?: string
    clinic_id?: string
}

export type delete_records_payload = {
    filters: filters_struct
}

export type get_records_payload = {
    filters: filters_struct
}
