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

    private handle_filters({clinic_department_id}: filters_struct) {
        const filter_literals = [];

        if (clinic_department_id) filter_literals.push(`${this.table_name}.clinic_department_id = ${clinic_department_id}`);

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

    public upsert_record({options: {clinic_department_id, day_of_week, time_from, time_to}, client = db}: method_payload<upsert_record_payload>) {
        const sql = `
            INSERT INTO ${this.table_name} (clinic_department_id, day_of_week, time_from, time_to)
            VALUES ($1,$2,$3,$4)
            RETURNING *
        `;

        return client.query(sql, [clinic_department_id, day_of_week, time_from, time_to]).then(({rows}) => rows[0])
    }

    public delete_record({options: {filters}, client = db}: method_payload<delete_record_payload>) {
        const sql = `
            DELETE FROM ${this.table_name}
            ${this.handle_filters(filters)}
        `;

        return client.query(sql);
    }
}

export const clinic_department_schedules_api = new Api({
    table_name: 'clinic_department_schedules'
});
