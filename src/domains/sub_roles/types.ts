export type get_available_roles_payload = {
    id?: number,
    clinic_id: string
}

export type add_sub_role_to_clinic_payload = {
    clinic_id: string,
    user_id: string
    sub_role_id: number
}
