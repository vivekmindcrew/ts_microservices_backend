import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send,
    ParseBody
} from '../../../etc/http/micro_controller';

import {verifyToken} from '../../../handlers/jwt';
import {user_favourites_domain} from "../../../domains/favourites";

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

        return user_favourites_domain.add_clinic_to_favourites({
            ...<any>body,
            user_id: userId
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

        return user_favourites_domain.remove_clinic_from_favourites({
            ...<any>body,
            user_id: userId
        })
    }

    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {

        const {
            userId
        } = ctx;

        return user_favourites_domain.get_user_favourite_clinics({
            user_id: userId as string
        })
    }
}

export = new Controller
