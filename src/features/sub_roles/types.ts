export type filters_struct = {
    id?: number,
}

export type get_records_payload = {
    limit?: number,
    offset?: number,
    filters?: filters_struct
    clinic_id? : string
}
