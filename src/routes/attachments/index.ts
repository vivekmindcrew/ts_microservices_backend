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
import {clinic_lists_domain} from '../../domains/clinics'

class Controller implements MicroController {

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @AcceptACL(ACCESS_ROLES.doctor)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {

        return clinic_lists_domain.get_attachments_by_clinic_id({
            ...req.query as any,
            user_id: <string>ctx.userId
        })
    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @AcceptACL(ACCESS_ROLES.doctor)
    @ParseBody
    async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {

        return clinic_lists_domain.add_attachment({
            ...req.body as any,
            user_id: <string>ctx.userId
        })
    }
    
}

export = new Controller
