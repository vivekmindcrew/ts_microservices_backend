export type upsert_record_payload = {
    monitoring_area_id: number
    day_of_week: number
    time_from: string
    time_to: string
}

export type filters_struct = {
    monitoring_area_id?: number
}
export type delete_record_payload = {
    filters: filters_struct
}

export type get_records_payload = {
    filters: filters_struct
}
