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
} from '../../../../etc/http/micro_controller'

import { verifyToken } from '../../../../handlers/jwt'
import { waiting_room_domain } from '../../../../domains/waiting_room'
import { ACCESS_ROLES } from '../../../../constants'

class Controller implements MicroController {
  @Catch
  @Send(200)
  @DecodeAccessToken(verifyToken as Decoder)
  @AcceptACL([ACCESS_ROLES.doctor, ACCESS_ROLES.clinic_admin])
  @ParseBody
  async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
    return waiting_room_domain.remove_staff({
      ...(req.body as any),
      user_id: ctx.userId
    })
  }
}

export = new Controller()
