import {
    base_api_image,
    method_payload
} from '../base_api_image'
import {db} from "../../db";
import {
    filters_struct,
    upsert_record_payload,
    get_records_payload,
    delete_records_payload,
    update_obj_payload,
    update_record_payload
} from './types';

class Api extends base_api_image {
    private handle_filters({id, user_id, clinic_id, doctor_id}: filters_struct) {
        const filter_literals = [];

        if (id) filter_literals.push(`${this.table_name}.id = ${id}`);
        if (user_id) filter_literals.push(`${this.table_name}.user_id = ${this.to_sql_string(user_id)}`);
        if (clinic_id) filter_literals.push(`${this.table_name}.clinic_id = ${this.to_sql_string(clinic_id)}`);
        if (doctor_id) filter_literals.push(`${this.table_name}.doctor_id = ${this.to_sql_string(doctor_id)}`);

        return filter_literals.length ? `WHERE ${filter_literals.join(' AND ')}` : ''
    }

    private handle_update_obj({feedback_verified}: update_obj_payload) {
        const update_literals = [];

        if (typeof feedback_verified === "boolean") update_literals.push(`feedback_verified = ${feedback_verified}`);

        return update_literals.length ? `SET ${update_literals.join()}` : ''
    }

    public async upsert_record({options: {user_id, clinic_id, doctor_id, feedback, score}, client = db}: method_payload<upsert_record_payload>) {
        const sql = `
            INSERT INTO ${this.table_name} (user_id, clinic_id, doctor_id, feedback, score, feedback_verified)
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING *
        `;

        return client.query(sql, [user_id, clinic_id, doctor_id, feedback, score]).then(({rows}) => rows[0]);
    }

    public async update_record({options: {update_obj, filters}, client = db}: method_payload<update_record_payload>) {
        const sql = `
            UPDATE ${this.table_name}
            ${this.handle_update_obj(update_obj)}
            ${this.handle_filters(filters)}
            RETURNING *
        `;

        return client.query(sql).then(({rows}) => rows);
    }

    public async delete_record({options: {filters}, client = db}: method_payload<delete_records_payload>) {
        const sql = `
            DELETE FROM ${this.table_name}
            ${this.handle_filters(filters)}
        `;

        return client.query(sql);
    }

    public async get_records_list({options: {filters, limit, offset}, client = db}: method_payload<get_records_payload>) {
        const sql = `
            SELECT patient_feedback_records.id, ${this.table_name}.created_at, score, feedback, feedback_verified,
                   json_build_object(
                       'id',
                       u.id,
                       'firstName',
                       u."firstName",
                       'lastName',
                       u."lastName",
                       'photo',
                       u.photo
                       ) as created_by
            FROM ${this.table_name}
            INNER JOIN users u on u.id = patient_feedback_records.user_id 
            ${this.handle_filters(filters)}
            ${this.handle_limit(limit)}
            ${this.handle_offset(offset)}
        `;

        return client.query(sql).then(({rows}) => rows)
    }
}

export const patient_feedback_records_api = new Api({
    table_name: 'patient_feedback_records'
});
