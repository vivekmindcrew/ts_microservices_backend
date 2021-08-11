import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send,
    ParseBody
} from '../../../etc/http/micro_controller';

import {verifyToken} from '../../../handlers/jwt'

import {clinic_position_domain} from "../../../domains/clinic_positions";

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @ParseBody
    async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        return clinic_position_domain.switch_clinic({
            ...req.body as any,
            user_id: <string>ctx.userId,
        })
    }
}

export = new Controller
