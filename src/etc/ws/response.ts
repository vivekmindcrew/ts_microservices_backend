interface ResponseConfig {
    error_message?: String | null;
    data?: object;
    requested_action?: string;
    index?: string | number;
    broadcast_message_type?: string
}

export class Response {
    public error_message: String | null;
    public data: object;
    public requested_action?: string;
    public index?: string | number;
    public status: 'ok' | 'error';
    public broadcast_message_type?: string;

    constructor({error_message, data, index, requested_action, broadcast_message_type}: ResponseConfig) {
        this.error_message = error_message || null;
        this.data = data || {};
        this.requested_action = requested_action;
        this.index = index;
        this.status = error_message ? 'error' : 'ok';
        this.broadcast_message_type = broadcast_message_type;
    }
}
