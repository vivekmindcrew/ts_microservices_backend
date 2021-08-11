import {IncomingMessage, ServerResponse} from 'http';
import {
    MicroController,
    Catch,
    handler_context,
    Decoder,
    DecodeAccessToken,
    Send,
    ParseBody, Validate
} from '../../etc/http/micro_controller';

import {verifyToken} from '../../handlers/jwt'

import {clinic_position_domain} from '../../domains/clinic_positions'
import {db} from "../../db";

class Controller implements MicroController {
    @Catch
    @Send(200)
    @DecodeAccessToken(verifyToken as Decoder)
    @Validate({
        query: {
            type: "object",
            props: {
                category: {
                    type: "number",
                    convert: true
                }
            }
        }
    })
    async GET(req: IncomingMessage, res: ServerResponse, ctx: handler_context) {
        return db.query(`
            SELECT trackers.id, trackers.name, row_to_json(a) as avatar, row_to_json(body_parts) as default_body_part, trackers.can_track, trackers.connection_options, 
            array_to_json(
                      array_agg(
                          CASE
                            WHEN (tracker_attachment.attachment_id IS NULL)
                              THEN jsonb_build_object(
                                'type', 'text',
                                'description', description
                              )
                            ELSE
                              (SELECT jsonb_build_object('type', type, 'source_url', source_url)
                               FROM attachments a
                               WHERE a.id = tracker_attachment.attachment_id)
                            END ORDER BY tracker_attachment.index ASC
                        ) FILTER ( WHERE tracker_attachment.id IS NOT NULL)
                    ) as attachments
            from trackers
                   LEFT JOIN attachments a on trackers.avatar_id = a.id
                   LEFT JOIN body_parts on trackers.default_body_part = body_parts.id
                   LEFT JOIN tracker_attachment on trackers.id = tracker_attachment.tracker_id
            WHERE trackers.category = $1
            GROUP BY trackers.id, body_parts.id, a.id
        `, [req.query.category]).then(({rows})=>rows)
    }
}

export = new Controller
