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

        return clinic_monitoring_domain.add_clinic_monitoring_area_patient({
            ...req.body as any,
            user_id: <string>userId
        })

    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @ParseBody
    async DELETE(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            userId
        } = ctx;

        return clinic_monitoring_domain.remove_clinic_monitoring_area_patient({
            ...req.body as any,
            user_id: <string>userId
        })

    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            userId
        } = ctx;

        return clinic_monitoring_domain.get_clinic_monitoring_area_patients_list({
            ...req.query as any,
            user_id: <string>userId
        })

    }
}

export = new Controller
