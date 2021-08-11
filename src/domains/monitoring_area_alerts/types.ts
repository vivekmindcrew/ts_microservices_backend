export type get_alerts_list_payload = {
    monitoring_area_id?: number,
    patient_id?: string,
    limit?: number,
    offset?: number,
    reviewed?: string
}

export type mark_as_reviewed_payload = {
    user_id: string
    alert_id: number
}
