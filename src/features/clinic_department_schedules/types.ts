export type upsert_record_payload = {
    clinic_department_id: number
    day_of_week: number
    time_from: string
    time_to: string
}

export type filters_struct = {
    clinic_department_id?: number
}
export type delete_record_payload = {
    filters: filters_struct
}

export type get_records_payload = {
    filters: filters_struct
}
