import {db} from "../../db";
import {
    base_api_image,
    method_payload
} from '../base_api_image'
import {
    filter_struct,
    insert_record_payload,
    delete_record_payload,
    get_record_payload
} from './types'

class Api extends base_api_image {

    private handle_filters({user_id, group_id}: filter_struct) {
        const filter_literals = [];

        if(user_id) filter_literals.push(`${this.table_name}.user_id = ${this.to_sql_string(user_id)}`);
        if (group_id) filter_literals.push(`${this.table_name}.group_id = ${group_id}`);

        return filter_literals.length ? `WHERE ${filter_literals.join(' AND ')}` : ''
    }

    public insert_record({options: {user_id, group_id}, client = db}: method_payload<insert_record_payload>) {
        const sql = `
            INSERT INTO ${this.table_name} (user_id, group_id)
            VALUES ($1,$2)
            ON CONFLICT (user_id, group_id)
            DO UPDATE SET group_id = EXCLUDED.group_id
            RETURNING *
        `;

        return client.query(sql, [user_id, group_id]).then(({rows}) => rows[0])
    }

    public get_record_list({options: {filters, limit, offset}, client = db}: method_payload<get_record_payload>) {
        const sql = `
            SELECT u.id,
                   u."firstName",
                   u."lastName",
                   u.photo
            from clinic_media_access_group_participant
                     INNER JOIN users u on u.id = clinic_media_access_group_participant.user_id
            ${this.handle_filters(filters)}
            ${this.handle_limit(limit)}
            ${this.handle_offset(offset)}
        `;

        return client.query(sql).then(({rows}) => rows)
    }

    public delete_record({options: {filters}, client = db}: method_payload<delete_record_payload>) {
        const sql = `
            DELETE FROM ${this.table_name}
            ${this.handle_filters(filters)}
        `;

        return client.query(sql);
    }
}

export const clinic_media_access_group_participant_api = new Api({
    table_name: 'clinic_media_access_group_participant'
});
