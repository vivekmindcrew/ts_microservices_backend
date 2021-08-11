import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send, ParseBody
} from '../../../etc/http/micro_controller';

import {verifyToken} from '../../../handlers/jwt'
import {clinic_media_domain} from "../../../domains/clinic_media";

class Controller implements MicroController {

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            userId
        } = ctx;

        return clinic_media_domain.get_clinic_media_folders({
            ...req.query as any,
            user_id: <string>userId
        })

    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @ParseBody
    async POST(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            userId
        } = ctx;

        return clinic_media_domain.add_clinic_media_folder({
            ...req.body as any,
            user_id: <string>userId
        })

    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @ParseBody
    async PUT(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            userId
        } = ctx;

        return clinic_media_domain.update_clinic_media_folder({
            ...req.body as any,
            user_id: <string>userId
        })

    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @ParseBody
    async DELETE(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            userId
        } = ctx;

        return clinic_media_domain.delete_clinic_media_folder({
            ...req.body as any,
            user_id: <string>userId
        })

    }
}

export = new Controller
