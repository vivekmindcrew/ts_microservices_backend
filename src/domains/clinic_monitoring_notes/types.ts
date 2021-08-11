export type create_note_payload = {
    monitoring_area_id: number
    user_id: string
    note: string
    created_by: string
}

export type get_notes_payload = {
    monitoring_area_id: number
    user_id: string,
    limit?: number,
    offset?: number
}

export type update_notes_payload = {
    id: number
    note: string
}

export type delete_notes_payload = {
    id: number
}
