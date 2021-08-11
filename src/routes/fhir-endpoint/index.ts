import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send,
    ParseBody,
    AcceptACL
} from '../../etc/http/micro_controller';

import {verifyToken} from '../../handlers/jwt'
import {ACCESS_ROLES} from "../../constants";

import {clinic_lists_domain} from '../../domains/clinics'

class Controller implements MicroController {

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @AcceptACL(ACCESS_ROLES.doctor)
    @ParseBody
    async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            userId
        } = ctx;

        return await clinic_lists_domain.add_fhir_endpoint({
            ...req.body as any,
            user_id: <string>userId
        });
    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @AcceptACL(ACCESS_ROLES.doctor)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            userId
        } = ctx;

        return await clinic_lists_domain.get_fhir_endpoints({
            user_id: <string>userId
        });
    }

}

export = new Controller
