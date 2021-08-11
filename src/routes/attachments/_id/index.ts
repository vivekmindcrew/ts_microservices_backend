import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send,
    AcceptACL
} from '../../../etc/http/micro_controller';

import {verifyToken} from '../../../handlers/jwt';
import {ACCESS_ROLES} from "../../../constants";
import {clinic_lists_domain} from '../../../domains/clinics'

class Controller implements MicroController {
    path = '/attachments/:id';
    priority = -1;

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @AcceptACL(ACCESS_ROLES.doctor)
    async DELETE(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            params: {
                id
            }
        } = req;


        return clinic_lists_domain.delete_attachment({
            attachment_id: id,
            user_id: <string>ctx.userId
        })
    }

}

export = new Controller
