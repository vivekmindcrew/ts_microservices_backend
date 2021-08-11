interface ResponseConfig {
    error_message?: String | null,
    data?: object;
}

export class Response {
    public error_message: String | null;
    public data: object | [];

    public status: 'ok' | 'error';

    constructor({error_message, data}: ResponseConfig) {
        this.error_message = error_message || null;
        this.data = data || {};
        this.status = error_message ? 'error' : 'ok'
    }
}
