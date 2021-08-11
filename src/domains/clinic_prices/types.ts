export type get_clinic_prices_payload = {
    clinic_id: string
}

export type upsert_clinic_prices_payload = {
    clinic_id: string,
    user_id: string,
    online_consultation_price: number
    home_visit_price: number
    consultation_price: number
}
