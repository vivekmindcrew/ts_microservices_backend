export type insert_record_payload = {
    user_id: string
    group_id: number
}

export type filter_struct = {
    user_id?: string,
    group_id? : number
}

export type get_record_payload = {
    filters: filter_struct,
    limit?: number,
    offset?: number
}

export type delete_record_payload = {
    filters: filter_struct
}
