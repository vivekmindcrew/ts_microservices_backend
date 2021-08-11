import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send, ParseBody
} from '../../etc/http/micro_controller';

import {verifyToken} from '../../handlers/jwt';
import {sub_roles_domain} from "../../domains/sub_roles";

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @ParseBody
    async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        return sub_roles_domain.add_role_to_clinic_payload({
            ...req.body as any,
            user_id: ctx.userId
        })
    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        return sub_roles_domain.get_available_roles({
            ...req.query as any
        })
    }
}

export = new Controller
