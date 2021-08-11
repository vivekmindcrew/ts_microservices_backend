import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    Send,
    handler_context,
} from '../../etc/http/micro_controller';

class Controller implements MicroController {

    @Catch
    @Send(200)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {

        return {
            request: "ping",
            answer: "pong"
        }
    }
}

export = new Controller
