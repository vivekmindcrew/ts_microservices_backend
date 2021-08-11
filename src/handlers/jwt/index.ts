import {CONFIGURATIONS} from '../../config';
import fetch from 'node-fetch'
import {EXCEPTION_MESSAGES} from "../../constants";

declare type decoded_token_payload = {
    userId: string,
    role: string,
    app: string,
    device: string
}

if (!CONFIGURATIONS.JWT.VERIFY_TOKEN_URL.length) throw new Error(EXCEPTION_MESSAGES.ON_BAD_START_EXCEPTION);

export async function verifyToken(token: string): Promise<decoded_token_payload> {

    return <decoded_token_payload> await fetch(CONFIGURATIONS.JWT.VERIFY_TOKEN_URL, {
        method: 'post',
        body: JSON.stringify({
            token
        }),
        headers: {'Content-Type': 'application/json'},
    })
        .then(res => {
            if (res.ok) return res.json();

            const ex = new Error(EXCEPTION_MESSAGES.ON_AUTH_FAILED_EXCEPTION);
            ex.statusCode = 401;
            throw ex;

        }, err => {
            err.statusCode = 401;
            throw err;
        })
        .then(json_response => json_response.data)
}
