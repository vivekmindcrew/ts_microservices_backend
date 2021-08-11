import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send
} from '../../etc/http/micro_controller';

import {verifyToken} from '../../handlers/jwt'

import {medical_level_domain} from '../../domains/medical_level'

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            query
        } = req;

        return medical_level_domain.get_list({
            ...query
        });

    }
}

export = new Controller
