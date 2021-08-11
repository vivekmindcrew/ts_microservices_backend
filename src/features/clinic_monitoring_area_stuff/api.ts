import {
    base_api_image,
    method_payload
} from '../base_api_image'
import {db} from "../../db";
import {
    filters_struct,
    upsert_record_payload,
    get_records_payload,
    delete_records_payload
} from './types';

class Api extends base_api_image {
    private handle_filters({user_id, monitoring_area_id}: filters_struct) {
        const filter_literals = [];

        if (user_id) filter_literals.push(`${this.table_name}.user_id = ${this.to_sql_string(user_id)}`);
        if (monitoring_area_id) filter_literals.push(`${this.table_name}.monitoring_area_id = ${monitoring_area_id}`);

        return filter_literals.length ? `WHERE ${filter_literals.join(' AND ')}` : ''
    }

    public async upsert_record({options: {user_id, monitoring_area_id}, client = db}: method_payload<upsert_record_payload>) {
        const sql = `
            INSERT INTO ${this.table_name} (user_id, monitoring_area_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, monitoring_area_id)
                DO UPDATE
                    SET monitoring_area_id = EXCLUDED.monitoring_area_id
            RETURNING *
        `;

        return client.query(sql, [user_id, monitoring_area_id]).then(({rows}) => rows[0]);
    }

    public async delete_record({options: {filters}, client = db}: method_payload<delete_records_payload>) {
        const sql = `
            DELETE FROM ${this.table_name}
            ${this.handle_filters(filters)}
        `;

        return client.query(sql);
    }

    public async get_records_list({options: {filters}, client = db}: method_payload<get_records_payload>) {
        const sql = `
            SELECT u.id,
                   u."firstName",
                   u."lastName",
                   u.photo
            from ${this.table_name}
                   INNER JOIN users u on ${this.table_name}.user_id = u.id
            ${this.handle_filters(filters)}
        `;

        return client.query(sql).then(({rows}) => rows)
    }
}

export const clinic_monitoring_area_stuff_api = new Api({
    table_name: 'clinic_monitoring_area_stuff'
});
