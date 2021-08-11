export type create_clinic_department_payload = {
    title: string
    clinic_id: string
    user_id: string
    attachment_id?: string
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

export type update_clinic_department_payload = {
    id: number
    user_id: string
    title: string
    attachment_id?: string | null,
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

export type get_clinic_departments_payload = {
    clinic_id: string,
    limit? : number
    offset? : number
}

export type delete_clinic_department_payload = {
    user_id: string
    id: number
}
