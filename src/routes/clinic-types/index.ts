import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send,
} from '../../etc/http/micro_controller';

import {verifyToken} from '../../handlers/jwt'

import {clinic_lists_domain} from '../../domains/clinics'

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

        return clinic_lists_domain.get_clinic_types({
            ...<any>query,
            user_id: <string>userId
        })

    }
}

export = new Controller
