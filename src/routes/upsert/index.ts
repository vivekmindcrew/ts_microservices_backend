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

import {verifyToken} from '../../handlers/jwt'
import {ACCESS_ROLES} from "../../constants";

import {clinic_lists_domain} from '../../domains/clinics'

class Controller implements MicroController {

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @AcceptACL(ACCESS_ROLES.doctor)
    @ParseBody
    async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        return clinic_lists_domain.insert_clinic({
            ...req.body as any
        })

    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @AcceptACL(ACCESS_ROLES.doctor)
    @ParseBody
    async PATCH(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        return clinic_lists_domain.update_clinic({
            ...req.body as any
        })

    }
}

export = new Controller
