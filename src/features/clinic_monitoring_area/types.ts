export type insert_record_payload = {
    clinic_id: string
    created_by?: string
    name: string
    medical_specialization_id?: number
    telephone_id?: string
    email?: string,
    attachment_id?: string
}

export type filter_struct = {
    id?: number
    ids?: number[]
    clinic_id?: string
    patient_ids?: string[]
    alert_types?: string[],
    alert_levels?: string[],
    search ? : string
}

export type update_obj_struct = {
    name?: string,
    medical_specialization_id?: number
    telephone_id?: string
    email?: string,
    attachment_id?: string | null
}

export type get_record_payload = {
    filters: filter_struct,
    checked_in_user_id?: string
    limit?: number,
    offset?: number
}

export type update_record_payload = {
    filters: filter_struct,
    update_obj: update_obj_struct
}

export type delete_record_payload = {
    filters: filter_struct
}

export type get_aggregated_records_list = {
    filters: filter_struct,
    limit?: number
    offset?: number
}


export type get_aggregated_records_total_count = {
    filters: filter_struct
}

export type get_monitoring_patients_payload = {
    filters : filter_struct
}
