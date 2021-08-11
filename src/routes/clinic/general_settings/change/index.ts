import { IncomingMessage, ServerResponse } from 'http'
import {
  MicroController,
  Catch,
  handler_context,
  Decoder,
  DecodeAccessToken,
  Send,
  ParseBody,
  Validate,
  AcceptACL
} from '../../../../etc/http/micro_controller'
import { verifyToken } from '../../../../handlers/jwt'
import { clinic_lists_domain } from '../../../../domains/clinics/index'
import { ACCESS_ROLES } from '../../../../constants'

class Controller implements MicroController {
  @Catch
  @Send(200)
  @DecodeAccessToken(verifyToken as Decoder)
  @AcceptACL([ACCESS_ROLES.clinic_admin, ACCESS_ROLES.doctor])
  @ParseBody
  async PUT(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
    return clinic_lists_domain.change_clinic_general_settings({
      ...(req.body as any),
      body: req.body
    })
  }
}

export = new Controller()
