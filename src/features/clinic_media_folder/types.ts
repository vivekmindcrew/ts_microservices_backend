export type insert_record_payload = {
    section: string
    display_name: string
    parent_folder_id?: number | null
    clinic_id: string
    created_by: string
}

export type filter_struct = {
    id?: number
    clinic_id?: string,
    parent_folder_id?: number | null
}

export type update_obj_struct = {
    section?: string
    display_name?: string
    parent_folder_id?: number
    access_group_id? : number
    access_type? : string,
    allowed_user_ids ? : string[] | null
}

export type get_record_payload = {
    filters: filter_struct,
    user_id : string
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
