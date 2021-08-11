import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send
} from '../../../etc/http/micro_controller';

import {verifyToken} from '../../../handlers/jwt'

import {clinic_position_domain} from '../../../domains/clinic_positions'

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            query
        } = req;

        const result = await clinic_position_domain.get_clinic_professionals({
            clinic_id: <any>query.clinic_id,
            search: <any>query.search
        });

        return {
            count: result.length
        }

    }
}

export = new Controller
