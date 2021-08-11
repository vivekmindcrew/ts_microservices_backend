import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send,
    ParseBody,
    AcceptACL
} from '../../../etc/http/micro_controller';

import {verifyToken} from '../../../handlers/jwt';
import {ACCESS_ROLES} from "../../../constants";
import {waiting_room_domain} from '../../../domains/waiting_room'

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    // @AcceptACL(ACCESS_ROLES.patient)
    @ParseBody
    async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        return waiting_room_domain.leave_waiting_room_queue({
            ...req.body as any,
            user_id: ctx.userId,
            role: ctx.role
        })
    }


}

export = new Controller
