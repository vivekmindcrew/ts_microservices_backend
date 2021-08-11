import { IncomingMessage, ServerResponse } from 'http'
import {
  MicroController,
  Catch,
  handler_context,
  Decoder,
  DecodeAccessToken,
  Send,
  AcceptACL
} from '../../../../etc/http/micro_controller'
import { verifyToken } from '../../../../handlers/jwt'
import { clinic_lists_domain } from '../../../../domains/clinics/index'
import { ACCESS_ROLES } from '../../../../constants'

class Controller implements MicroController {
  @Catch
  @Send(200)
  @DecodeAccessToken(verifyToken as Decoder)
  @AcceptACL([ACCESS_ROLES.clinic_admin, ACCESS_ROLES.doctor, ACCESS_ROLES.patient])
  async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
    return clinic_lists_domain.current_auto_booking_status({
      ...(req.query as any)
    })
  }
}

export = new Controller()
