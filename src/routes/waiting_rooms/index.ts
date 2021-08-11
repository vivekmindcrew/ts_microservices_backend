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
} from '../../etc/http/micro_controller';

import {verifyToken} from '../../handlers/jwt';
import {ACCESS_ROLES} from "../../constants";
import {waiting_room_domain} from '../../domains/waiting_room'

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @AcceptACL(ACCESS_ROLES.doctor)
    @ParseBody
    async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        return waiting_room_domain.create_waiting_room({
            ...req.body as any,
            user_id: ctx.userId
        })
    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @AcceptACL(ACCESS_ROLES.doctor)
    @ParseBody
    async PUT(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {

        return waiting_room_domain.update_waiting_room({
            ...req.body as any,
            user_id: ctx.userId
        })
    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @AcceptACL(ACCESS_ROLES.doctor)
    @ParseBody
    async DELETE(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {

        return waiting_room_domain.delete_waiting_room({
            ...req.body as any,
            user_id: ctx.userId
        })
    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        if(req.query.booking_only) req.query.booking_only = JSON.parse(req.query.booking_only)
        if(req.query.medical_specializations_ids) req.query.medical_specializations_ids = JSON.parse(req.query.medical_specializations_ids)
        return waiting_room_domain.get_waiting_rooms_list({
            ...req.query as any,
            user_id: ctx.userId
        })
    }

}

export = new Controller
