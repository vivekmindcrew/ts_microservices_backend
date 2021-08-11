import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send, ParseBody, Validate
} from '../../../etc/http/micro_controller';

import {verifyToken} from '../../../handlers/jwt'

import {clinic_lists_domain} from '../../../domains/clinics'
import {ACCESS_ROLES} from "../../../constants";
import {db} from "../../../db";

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @ParseBody
    @Validate({
        body: {
            type: "object",
            props: {
                blood_type: {
                    type: 'number',
                    optional: true
                },
                rh: {
                    type: 'string',
                    optional: true
                }
            }
        }
    })
    async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            userId,
            role
        } = ctx;

        const {
            blood_type,
            rh,
            patient_id
        } = req.body

        if (role === ACCESS_ROLES.patient) {
            const sql = `
                UPDATE users SET blood_type = $1, rh = $2
                WHERE id = $3 
            `;

            await db.query(sql, [blood_type, rh, userId])
        }

        if (role === ACCESS_ROLES.doctor && patient_id) {
            const sql = `
                UPDATE users SET blood_type = $1, rh = $2
                WHERE id = $3 
            `;

            await db.query(sql, [blood_type, rh, patient_id])
        }

        return {
            success: true
        }
    }
}

export = new Controller
