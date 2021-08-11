import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send, ParseBody
} from '../../../etc/http/micro_controller';

import {verifyToken} from '../../../handlers/jwt'
import {clinic_monitoring_domain} from "../../../domains/clinic_monitoring";

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @ParseBody
    async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            userId
        } = ctx;

        return clinic_monitoring_domain.get_available_clinic_monitoring_areas({
            ...req.body as any,
            user_id: <string>userId
        })

    }
}

export = new Controller
