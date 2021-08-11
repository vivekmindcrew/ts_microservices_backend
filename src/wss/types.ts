export type send_message_options = {
    user_to_notify: string,
    payload: send_message_payload
}

export type send_message_payload = {
    broadcast_message_type: string,
    message: any
}
