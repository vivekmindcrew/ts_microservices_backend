import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send, ParseBody
} from '../../../etc/http/micro_controller';
import {verifyToken} from '../../../handlers/jwt';
import {patient_feedback_domain} from "../../../domains/patient_feedback";

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @ParseBody
    async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        return patient_feedback_domain.create_patient_feedback({
            ...req.body as any,
            user_id: ctx.userId
        });
    }
}

export = new Controller
