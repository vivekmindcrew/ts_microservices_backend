import { IncomingMessage, ServerResponse } from 'http'
import {
  MicroController,
  Catch,
  handler_context,
  Decoder,
  DecodeAccessToken,
  Send,
  AcceptACL,
  ParseBody
} from '../../../etc/http/micro_controller'

import { verifyToken } from '../../../handlers/jwt'
import { clinic_lists_domain } from '../../../domains/clinics/index'
import { ACCESS_ROLES } from '../../../constants/index'

class Controller implements MicroController {
  @Catch
  @Send(200)
  @DecodeAccessToken(verifyToken as Decoder)
  @AcceptACL([
    ACCESS_ROLES.clinic_admin,
    ACCESS_ROLES.doctor,
    ACCESS_ROLES.patient
  ])
  @ParseBody
  async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
    let data = await clinic_lists_domain.get_clinic_time_slots({
      ...(req.body as any)
    })
    return Array.isArray(data) && data.length > 0 ? data[0] : data
  }
}

export = new Controller()
