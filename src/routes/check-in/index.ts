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

import {verifyToken} from '../../handlers/jwt';

import {clinic_position_domain} from '../../domains/clinic_positions';

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

        return clinic_position_domain.add_clinic_position({
            ...<any>body,
            user_id: <string>userId
        })

    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @ParseBody
    async PUT(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            body
        } = req;

        const {
            userId
        } = ctx;

        return clinic_position_domain.rebase_clinic_position_info({
            ...<any>body,
            user_id: <string>userId
        })
    }
}

export = new Controller
