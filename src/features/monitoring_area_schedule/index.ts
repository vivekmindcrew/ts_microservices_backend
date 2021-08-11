import {db} from "../../db";
import {
    base_api_image,
    method_payload
} from '../base_api_image'
import {
    filters_struct,
    delete_record_payload,
    upsert_record_payload,
    get_records_payload
} from './types'

class Api extends base_api_image {

    private handle_filters({monitoring_area_id}: filters_struct) {
        const filter_literals = [];

        if (monitoring_area_id) filter_literals.push(`${this.table_name}.monitoring_area_id = ${monitoring_area_id}`);

        return filter_literals.length ? `WHERE ${filter_literals.join(' AND ')}` : ''
    }

    public get_records({options: {filters}, client = db}: method_payload<get_records_payload>) {
        const sql = `
            SELECT *
            FROM ${this.table_name}
            ${this.handle_filters(filters)}
        `;

        return client.query(sql).then(({rows}) => rows)
    }

    public upsert_record({options: {monitoring_area_id, day_of_week, time_from, time_to}, client = db}: method_payload<upsert_record_payload>) {
        const sql = `
            INSERT INTO ${this.table_name} (monitoring_area_id, day_of_week, time_from, time_to)
            VALUES ($1,$2,$3,$4)
            RETURNING *
        `;

        return client.query(sql, [monitoring_area_id, day_of_week, time_from, time_to]).then(({rows}) => rows[0])
    }

    public delete_record({options: {filters}, client = db}: method_payload<delete_record_payload>) {
        const sql = `
            DELETE FROM ${this.table_name}
            ${this.handle_filters(filters)}
        `;

        return client.query(sql);
    }
}

export const monitoring_area_schedule_api = new Api({
    table_name: 'monitoring_area_schedules'
});
