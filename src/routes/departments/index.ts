import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send,
    ParseBody
} from '../../etc/http/micro_controller';

import {verifyToken} from '../../handlers/jwt';
import {clinic_departments_domain} from "../../domains/clinic_departments";

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @ParseBody
    async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            body
        } = req;

        const {
            userId
        } = ctx;

        return clinic_departments_domain.create_clinic_department({
            ...<any>body,
            user_id: <string>userId
        })

    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @ParseBody
    async DELETE(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            body
        } = req;

        const {
            userId
        } = ctx;

        return clinic_departments_domain.delete_clinic_department({
            ...<any>body,
            user_id: <string>userId
        })

    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            query
        } = req;

        return clinic_departments_domain.get_clinic_departments({
            ...<any>query
        })

    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @ParseBody
    async PUT(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            body
        } = req;

        const {
            userId
        } = ctx;

        return clinic_departments_domain.update_clinic_department({
            ...<any>body,
            user_id: <string>userId
        })
    }
}

export = new Controller
