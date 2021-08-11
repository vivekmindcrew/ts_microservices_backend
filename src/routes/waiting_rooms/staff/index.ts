import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send
} from '../../../etc/http/micro_controller';

import {verifyToken} from '../../../handlers/jwt';
import {waiting_room_domain} from '../../../domains/waiting_room'

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {

        return waiting_room_domain.get_waiting_room_doctors({
            ...req.query as any,
            user_id: ctx.userId
        })
    }


}

export = new Controller
