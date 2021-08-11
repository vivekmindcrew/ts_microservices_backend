export type insert_record_payload = {
    section: string
    attachment_id: string
    display_name: string
    description?: string
    folder_id?: number
    clinic_id: string
    created_by: string
}

export type filter_struct = {
    id?: number
    clinic_id?: string
    folder_id ? : number
}

export type update_obj_struct = {
    section?: string
    display_name?: string
    folder_id?: number
    description? : string
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
