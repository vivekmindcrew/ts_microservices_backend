import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send
} from '../../../etc/http/micro_controller';

import {verifyToken} from '../../../handlers/jwt'

import {clinic_position_domain} from '../../../domains/clinic_positions'

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            query
        } = req;

        const {
            userId
        } = ctx;

        return clinic_position_domain.get_user_specializations({
            user_id: <string> userId,
            ...query
        })
    }
}

export = new Controller
