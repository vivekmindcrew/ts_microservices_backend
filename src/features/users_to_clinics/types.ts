export type create_record_payload = {
    user_id: string,
    clinic_id: string
}

export type get_list_payload = {
    user_id: string
}

export type get_clinics_patient_payload = {
    clinic_id: string
    search?: string
    limit?: number
    offset?: number
}

export type get_clinic_patient_total_count_payload = {
    clinic_id: string
    search?: string
}
