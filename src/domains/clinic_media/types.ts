export type add_clinic_media_record_payload = {
    attachment_id: string
    section: string
    display_name: string
    folder_id?: number
    user_id: string
    description: string
}

export type update_clinic_media_record_payload = {
    id: number
    display_name: string
    folder_id?: number
    description?: string
    user_id: string
}

export type delete_clinic_media_record_payload = {
    id: number
    user_id: string
}

export type create_clinic_media_folder_payload = {
    section: string
    display_name: string
    parent_folder_id?: number
    user_id: string
}

export type update_clinic_media_folder_payload = {
    id: number
    display_name: string
    parent_folder_id?: number
    user_id: string
    access_type?: string,
    access_group_id?: number
    allowed_user_ids?: string[]
}

export type delete_clinic_media_folder_payload = {
    id: number
    user_id: string
}

export type get_clinic_media_records_payload = {
    user_id: string,
    folder_id?: number,
    limit?: number
    offset?: number
}

export type get_clinic_media_folders_payload = {
    user_id: string,
    parent_folder_id?: number,
    limit?: number
    offset?: number
}

export type create_clinic_media_access_group_payload = {
    type: string
    display_name: string
    user_id: string
    avatar_id?: string
}

export type update_clinic_media_access_group_payload = {
    id : number
    user_id: string
    avatar_id?: string
    display_name: string
}

export type delete_clinic_media_access_group_payload = {
    id: number
    user_id: string
}

export type get_clinic_media_access_group_payload = {
    user_id: string
}

export type add_clinic_media_access_group_participant_payload = {
    user_id : string
    group_id : number
    target_id : string
}

export type remove_clinic_media_access_group_participant_payload = {
    user_id : string
    group_id : number
    target_id : string
}

export type get_clinic_media_access_group_participant_payload = {
    user_id : string
    group_id : number
}
