export type filters_struct = {
    clinic_id?: string
}

export type get_records_payload = {
    filters?: filters_struct
}

export type upsert_record_payload = {
    clinic_id: string
    online_consultation_price: number
    home_visit_price: number
    consultation_price: number
}
