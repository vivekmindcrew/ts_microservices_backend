import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send,
    ParseBody
} from '../../etc/http/micro_controller';

import {verifyToken} from '../../handlers/jwt'

import {clinic_position_domain} from '../../domains/clinic_positions'

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @ParseBody
    async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            body
        } = req;

        const {
            userId
        } = ctx;

        return clinic_position_domain.leave_clinic({
            ...<any>body,
            user_id: userId
        })

    }
}

export = new Controller
