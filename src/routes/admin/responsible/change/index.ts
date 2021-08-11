import { IncomingMessage, ServerResponse } from 'http'
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send,
    ParseBody,
    AcceptACL
} from '../../../../etc/http/micro_controller'

import { verifyToken } from '../../../../handlers/jwt'
import { ACCESS_ROLES } from '../../../../constants'
import { clinic_lists_domain } from '../../../../domains/clinics'

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @AcceptACL([ACCESS_ROLES.clinic_admin, ACCESS_ROLES.doctor])
    @ParseBody
    async PUT(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        let { userId } = ctx
        return clinic_lists_domain.update_responsible_persons({
            ...req.body as any,
            userId
        });
    }
}

export = new Controller()
