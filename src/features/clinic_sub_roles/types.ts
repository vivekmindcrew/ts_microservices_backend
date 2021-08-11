export type filters_struct = {
    clinic_id?: string,
    sub_role_id?: number
}

export type get_records_payload = {
    limit?: number,
    offset?: number,
    filters?: filters_struct
}

export type upsert_record_payload = {
    sub_role_id: number
    clinic_id: string
}
