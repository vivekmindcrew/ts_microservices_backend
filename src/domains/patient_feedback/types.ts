export type create_patient_feedback_payload = {
    user_id: string
    doctor_id: string
    score: number
    feedback: string
}

export type get_patient_feedback_list_payload = {
    doctor_id: string
    limit?: number
    offset?: number
}

export type update_patient_feedback_payload = {
    id : number,
    feedback_verified : boolean
    doctor_id : string
}
