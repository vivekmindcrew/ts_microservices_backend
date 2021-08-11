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
} from '../../../etc/http/micro_controller';

import {verifyToken} from '../../../handlers/jwt'
import {ACCESS_ROLES} from "../../../constants";

import {clinic_lists_domain} from '../../../domains/clinics'

class Controller implements MicroController {
    path = '/fhir-endpoint/:id';
    priority = -1;

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @AcceptACL(ACCESS_ROLES.doctor)
    @ParseBody
    async PATCH(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            params: {
                id
            }
        } = req;
        const {
            userId
        } = ctx;

        return await clinic_lists_domain.edit_fhir_endpoint({
            ...req.body as any,
            id,
            user_id: <string>userId
        });
    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @AcceptACL(ACCESS_ROLES.doctor)
    async DELETE(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            params: {
                id
            }
        } = req;
        const {
            userId
        } = ctx;

        return await clinic_lists_domain.delete_fhir_endpoint({
            id,
            user_id: <string>userId
        });
    }
}

export = new Controller
