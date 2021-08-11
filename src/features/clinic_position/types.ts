export type filters_struct = {
    user_id?: string,
    clinic_id?: string,
    medical_specialization_id?: number,
    is_active?: boolean
    is_admin?: boolean
}

export type update_obj_struct = {
    is_active?: boolean
    is_admin?: boolean
    verified?: boolean
    department_id?: number
}

export type get_records_payload = {
    filters: filters_struct
}

export type update_record_payload = {
    filters: filters_struct,
    update_obj: update_obj_struct
}

export type get_user_specializations_struct = {
    user_id: string,
    clinic_id?: string,
    medical_specialization_id?: number
}

export type get_clinics_professionals_payload = {
    clinic_id: string,
    search?: string,
    limit?: number,
    offset?: number,
    medical_specialization_ids?: number[],
    rating_from?: number
    rating_to?: number
}

export type create_record_payload = {
    user_id: string,
    clinic_id: string,
    medical_specialization_id?: number,
    medical_level_id?: number,
    corporate_email?: string | null,
    corporate_phone_id?: string | null,
    chat_allowed?: boolean,
    audio_call_allowed?: boolean,
    video_call_allowed?: boolean,
    contact_directly_allowed?: boolean,
    certificate?: string | null,
    certificate_number?: string | null,
    department_id?: number
    sub_role_id?: number
}

export type delete_record_payload = {
    user_id: string,
    clinic_id: string,
    medical_specialization_id: number
}

export type get_doctor_ids_by_specialization_payload = {
    clinic_id?: string
    medical_specialization_id: number
}

export type change_department_payload = {
    user_id: string,
    clinic_id: string,
    department_id: number
}

export type doctors_by_clinic_payload = {
    clinic_id: string
} 

export type get_all_responsible_persons_payload = {
    clinic_id: string
    room_id: number
}
