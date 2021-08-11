export type insert_record_payload = {
    display_name: string
    avatar_id?: string
    created_by: string
    type: string
}

export type filter_struct = {
    id?: number
    created_by: string
    type?: string
}

export type update_obj_struct = {
    display_name?: string
    type?: string
    avatar_id?: string
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
