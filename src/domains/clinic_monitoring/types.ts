export type create_clinic_monitoring_area_payload = {
    user_id: string,
    attachment_id?: string
    clinic_id: string,
    name: string,
    medical_specialization_id?: number
    telephone: {
        code: string,
        number: number
    }
    email?: string,
    schedules: {
        day_of_week: number
        time_from: string
        time_to: string
    }[]
}

export type update_clinic_monitoring_area_payload = {
    user_id: string,
    clinic_id: string,
    attachment_id?: string | null,
    id: number,
    name: string,
    medical_specialization_id?: number
    telephone: {
        code: string,
        number: number
    }
    email?: string,
    schedules: {
        day_of_week: number
        time_from: string
        time_to: string
    }[]
}

export type delete_clinic_monitoring_area_payload = {
    user_id: string,
    id: number
}

export type get_clinic_monitoring_area_list_payload = {
    clinic_id: string,
    user_id: string
}

export type get_available_clinic_monitoring_areas_payload = {
    clinic_id: string,
    user_id: string
}

export type add_clinic_monitoring_area_stuff_payload = {
    user_id: string
    target_id: string
    monitoring_area_id: number
}

export type remove_clinic_monitoring_area_stuff_payload = {
    user_id: string
    target_id: string
    monitoring_area_id: number
}

export type add_clinic_monitoring_area_patient_payload = {
    user_id: string
    target_id: string
    monitoring_area_id: number
}

export type remove_clinic_monitoring_area_patient_payload = {
    user_id: string
    target_id: string
    monitoring_area_id: number
}

export type get_clinic_monitoring_area_patients_list_payload = {
    user_id: string
    monitoring_area_id: number
}

export type get_clinic_monitoring_area_stuff_list_payload = {
    user_id: string
    monitoring_area_id: number
}

export type get_clinic_monitoring_area_patient_aggregated_info_payload = {
    user_id : string
    limit?: number,
    offset?: number,
    monitoring_area_ids?: number[],
    patient_ids?: string[],
    alert_types?: string[],
    alert_levels?: string[],
    search? : string
}

export type get_monitoring_patients_payload = {
    user_id : string
    monitoring_area_ids?: number[],
}
