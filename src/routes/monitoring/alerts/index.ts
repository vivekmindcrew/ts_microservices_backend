import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send, ParseBody
} from '../../../etc/http/micro_controller';

import {verifyToken} from '../../../handlers/jwt';
import {monitoring_area_alerts_domain} from "../../../domains/monitoring_area_alerts";

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @ParseBody
    async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            userId
        } = ctx;

        return monitoring_area_alerts_domain.create_alert({
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

        return monitoring_area_alerts_domain.get_alerts({
            ...req.query as any,
            user_id: <string>userId
        })

    }
}

export = new Controller
