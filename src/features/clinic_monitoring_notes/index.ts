import {db} from "../../db";
import {
    base_api_image,
    method_payload
} from '../base_api_image'
import {
    filter_struct,
    update_obj_struct,
    insert_record_payload,
    update_record_payload,
    delete_record_payload,
    get_record_payload
} from './types'

class Api extends base_api_image {

    private handle_filters({id, monitoring_area_id, user_id}: filter_struct) {
        const filter_literals = [];

        if (id) filter_literals.push(`${this.table_name}.id = ${id}`);
        if (user_id) filter_literals.push(`${this.table_name}.user_id = ${this.to_sql_string(user_id)}`);
        if(monitoring_area_id) filter_literals.push(`${this.table_name}.monitoring_area_id = ${monitoring_area_id}`)

        return filter_literals.length ? `WHERE ${filter_literals.join(' AND ')}` : ''
    }

    private handle_update_obj({note}: update_obj_struct) {
        const update_literals = [];

        if (note) update_literals.push(`note = ${this.to_sql_string(note)}`);

        return update_literals.length ? `SET ${update_literals.join()}` : ''
    }

    public insert_record({options: {monitoring_area_id, note, user_id, created_by}, client = db}: method_payload<insert_record_payload>) {
        const sql = `
            INSERT INTO ${this.table_name} (monitoring_area_id, note, user_id, created_by)
            VALUES ($1,$2,$3,$4)
            RETURNING *
        `;

        return client.query(sql, [monitoring_area_id, note, user_id, created_by]).then(({rows}) => rows[0])
    }

    public get_record_list({options: {filters, limit, offset}, client = db}: method_payload<get_record_payload>) {
        const sql = `
            SELECT monitoring_area_notes.id,
                   monitoring_area_notes.note,
                   row_to_json(u)  as created_by,
                   row_to_json(u2) as patient_info,
                   monitoring_area_notes.created_at
            from monitoring_area_notes
                     INNER JOIN users u on u.id = monitoring_area_notes.created_by
                     INNER JOIN users u2 on u2.id = monitoring_area_notes.user_id
            ${this.handle_filters(filters)}
            ORDER BY monitoring_area_notes.created_at DESC
            ${this.handle_limit(limit)}
            ${this.handle_offset(offset)}
        `;

        return client.query(sql).then(({rows}) => rows)
    }

    public update_record({options: {filters, update_obj}, client = db}: method_payload<update_record_payload>) {
        const sql = `
            UPDATE ${this.table_name}
            ${this.handle_update_obj(update_obj)}
            ${this.handle_filters(filters)}
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

export const monitoring_area_notes_api = new Api({
    table_name: 'monitoring_area_notes'
});
