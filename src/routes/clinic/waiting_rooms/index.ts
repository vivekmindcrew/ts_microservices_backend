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
} from '../../../etc/http/micro_controller'

import { verifyToken } from '../../../handlers/jwt'
import { ACCESS_ROLES } from '../../../constants'
import { waiting_room_domain } from '../../../domains/waiting_room'

class Controller implements MicroController {
  @Catch
  @Send(200)
  @DecodeAccessToken(verifyToken as Decoder)
  @AcceptACL([
    ACCESS_ROLES.clinic_admin,
    ACCESS_ROLES.doctor,
    ACCESS_ROLES.patient
  ])
  async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
    return waiting_room_domain.waiting_rooms_by_clinic({
      ...(req.query as any),
      user_id: ctx.userId as string
    })
  }
}

export = new Controller()
