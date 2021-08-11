import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Send
} from '../../etc/http/micro_controller';

import {clinic_lists_domain} from '../../domains/clinics'

class Controller implements MicroController {
    path = '/details/:clinic_id';

    @Catch
    @Send(200)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            params: {
                clinic_id
            }
        } = req;

        const [record] = await clinic_lists_domain.get_clinics_list({
            id: clinic_id
        });

        return record;
    }
}

export = new Controller
