import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Send
} from '../../etc/http/micro_controller';

import {clinic_position_domain} from '../../domains/clinic_positions'

class Controller implements MicroController {
    @Catch
    @Send(200)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            query
        } = req;

        return clinic_position_domain.get_clinic_professionals({
            ...<any>query
        });

    }
}

export = new Controller
