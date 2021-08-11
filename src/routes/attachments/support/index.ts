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

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @AcceptACL(ACCESS_ROLES.system_admin)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {

        return clinic_lists_domain.get_attachments_by_sysadmin({
            ...req.query as any
        })
    }    
}

export = new Controller
