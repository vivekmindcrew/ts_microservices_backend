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
    @AcceptACL(ACCESS_ROLES.doctor)
    @ParseBody
    async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {

        return waiting_room_domain.doctor_check_in_waiting_room({
            ...req.body as any,
            user_id: ctx.userId
        })
    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @AcceptACL(ACCESS_ROLES.doctor)
    async DELETE(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {

        return waiting_room_domain.doctor_check_out_from_waiting_room({
            user_id: ctx.userId as string
        })
    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @AcceptACL(ACCESS_ROLES.doctor)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {

        return waiting_room_domain.get_doctor_waiting_room({
            ...req.query as any,
            user_id: ctx.userId
        })
    }

}

export = new Controller
