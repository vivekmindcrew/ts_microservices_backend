export type filters_struct = {
    id? : number,
    clinic_id?: string
}

export type get_records_payload = {
    limit?: number,
    offset?: number,
    filters?: filters_struct
}
