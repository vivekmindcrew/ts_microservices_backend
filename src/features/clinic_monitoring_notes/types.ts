export type insert_record_payload = {
    monitoring_area_id: number
    user_id: string
    note : string
    created_by: string
}

export type filter_struct = {
    id?: number
    monitoring_area_id?: number
    user_id?: string
}

export type update_obj_struct = {
    note?: string
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
