export type upsert_record_payload = {
    user_id: string
    monitoring_area_id: number
}

export type filters_struct = {
    user_id?: string
    monitoring_area_id?: number
}

export type delete_records_payload = {
    filters: filters_struct
}

export type get_records_payload = {
    filters: filters_struct
}
