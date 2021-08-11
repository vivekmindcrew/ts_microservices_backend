import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send, ParseBody
} from '../../etc/http/micro_controller';

import {verifyToken} from '../../handlers/jwt'

import {clinic_prices_domain} from '../../domains/clinic_prices'

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @ParseBody
    async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        ctx = {userId :'8570a250-1265-490f-8b66-5b9825300340'}
        const {
            userId
        } = ctx;

        return clinic_prices_domain.add_clinic_prices({
            ...req.body as any,
            user_id: <string>userId
        })

    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        ctx = {userId :'8570a250-1265-490f-8b66-5b9825300340'}
        const {
            userId
        } = ctx;

        return clinic_prices_domain.get_clinic_prices({
            ...req.query as any,
            user_id: <string>userId
        })

    }
}

export = new Controller
