import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send,
} from '../../../../../etc/http/micro_controller';

import {verifyToken} from '../../../../../handlers/jwt';
import {waiting_room_domain} from '../../../../../domains/waiting_room'

class Controller implements MicroController {
    path = '/waiting_rooms/online_consultation/status/:clinic_id';
    priority = -1;

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            params: {
                clinic_id
            }
        } = req;

        return waiting_room_domain.online_consultation_get_status({
            clinic_id,
        })
    }
}

export = new Controller