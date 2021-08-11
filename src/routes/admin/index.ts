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

import {verifyToken} from '../../handlers/jwt'

import {clinic_position_api} from "../../features/clinic_position/api";
import {EXCEPTION_MESSAGES} from "../../constants";
import {db} from "../../db";

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {

        const {
            userId
        } = ctx;

        const [requester_active_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    is_active: true,
                    user_id: userId
                }
            }
        });

        if (!requester_active_clinic_position) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_CLINIC_STUFF_EX);
            ex.statusCode = 400;
            throw ex;
        }

        return db.query(`
        SELECT u.id, u."firstName", u."lastName", u.photo from clinic_positions
        INNER JOIN users u on u.id = clinic_positions.user_id
        where is_admin is true and clinic_id = $1
        `, [requester_active_clinic_position.clinic_id]).then(({rows}) => rows[0]);

    }
}

export = new Controller
