import {db} from "../../db";
import {
    base_api_image,
    method_payload
}
    from '../base_api_image'
import {
    create_record_payload
} from './types'

class Api extends base_api_image {
    public async insert_record({options: {user_id, alert_id}, client = db}: method_payload<create_record_payload>) {
        const sql = `
            INSERT INTO alert_reviews (alert_id, user_id) 
            VALUES ($1, $2)
            ON CONFLICT (alert_id, user_id) DO UPDATE SET created_at = EXCLUDED.created_at
            RETURNING *
        `;

        return client.query(sql, [alert_id, user_id]).then(({rows}) => rows[0]);
    }
}

export const monitoring_alert_reviews_api = new Api({
    table_name: 'alert_reviews'
});
