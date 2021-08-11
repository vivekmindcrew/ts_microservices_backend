export type filters_struct = {
    monitoring_area_id?: number,
    patient_id?: string
}

export type get_records_payload = {
    limit?: number,
    offset?: number,
    reviewed? : boolean,
    filters?: filters_struct
}
