export type insert_record_payload = {
    clinic_id: string
    created_by?: string
    title: string,
    medical_specialization_id?: number
    telephone_id?: string
    email?: string,
    attachment_id?: string
}

export type filter_struct = {
    id?: number
    clinic_id?: string
}

export type update_obj_struct = {
    title?: string
    medical_specialization_id?: number
    telephone_id?: string
    email?: string,
    attachment_id?: string | null
}

export type get_record_payload = {
    filters: filter_struct,
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
