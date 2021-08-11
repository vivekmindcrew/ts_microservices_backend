import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send, ParseBody, Validate
} from '../../../etc/http/micro_controller';

import {verifyToken} from '../../../handlers/jwt'
import {clinic_media_domain} from "../../../domains/clinic_media";
import {clinic_position_api} from "../../../features/clinic_position/api";
import {EXCEPTION_MESSAGES} from "../../../constants";
import {db} from "../../../db";

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @Validate({
        query: {
            type: 'object',
            props: {
                id: {
                    type: 'number',
                    convert: true
                }
            }
        }
    })
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        const {
            userId
        } = ctx;

        const [requester_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    user_id: userId,
                    is_active: true
                }
            }
        });

        if (!requester_clinic_position) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_CLINIC_STUFF_EX);
            ex.statusCode = 400;
            throw ex;
        }

        return db.query(`
            with recursive r as (
                SELECT clinic_media_folder.* from clinic_media_folder where id = $1 and clinic_id = $2
                UNION
                SELECT clinic_media_folder.* from clinic_media_folder
                INNER JOIN r on r.parent_folder_id = clinic_media_folder.id
            )
            
            SELECT array_to_json(array_agg(jsonb_build_object('id', r.id, 'display_name', r.display_name))) as records from r
        `, [req.query.id, requester_clinic_position.clinic_id]).then(({rows})=>rows[0] && rows[0].records || [])

    }
}

export = new Controller
