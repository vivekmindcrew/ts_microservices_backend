import {send_message_payload} from '../wss/types'

export type send_notification_payload = {
    user_id: string
    title: string
    body: string
    data: { [key: string]: string },
    android?: { [key: string]: any },
    apns?: { [key: string]: any },
}

export type shared_broadcast_message_payload = {
    send_by: string
    user_to_notify: string
    message: send_message_payload
}

export type send_sms_payload = {
    telephone: string,
    text: string
}
