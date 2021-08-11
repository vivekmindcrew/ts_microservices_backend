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

import {CONFIGURATIONS} from '../../config'

class Api extends base_api_image {

    private handle_filters({id, clinic_id}: filter_struct) {
        const filter_literals = [];

        if (id) filter_literals.push(`${this.table_name}.id = ${id}`);
        if (clinic_id) filter_literals.push(`${this.table_name}.clinic_id = ${this.to_sql_string(clinic_id)}`);

        return filter_literals.length ? `WHERE ${filter_literals.join(' AND ')}` : ''
    }

    private handle_update_obj({title, attachment_id, telephone_id, medical_specialization_id, email}: update_obj_struct) {
        const update_literals = [];

        if (title) update_literals.push(`title = ${this.to_sql_string(title)}`);
        if (attachment_id !== undefined) update_literals.push(`attachment_id = ${attachment_id ? this.to_sql_string(attachment_id) : 'null'}`);
        if (telephone_id) update_literals.push(`telephone_id = ${this.to_sql_string(telephone_id)}`);
        if (medical_specialization_id) update_literals.push(`medical_specialization_id = ${medical_specialization_id}`);
        if (email) update_literals.push(`email = ${this.to_sql_string(email)}`);

        return update_literals.length ? `SET ${update_literals.join()}` : ''
    }

    public insert_record({options: {title, clinic_id, created_by, attachment_id, medical_specialization_id, email, telephone_id}, client = db}: method_payload<insert_record_payload>) {
        const sql = `
            INSERT INTO ${this.table_name} (title, clinic_id, created_by,attachment_id, medical_specialization_id, email, telephone_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING *
        `;

        return client.query(sql, [title, clinic_id, created_by, attachment_id, medical_specialization_id, email, telephone_id]).then(({rows}) => rows[0])
    }

    public get_record_list({options: {filters, limit, offset}, client = db}: method_payload<get_record_payload>) {
        const sql = `
            SELECT 
                    ${this.table_name}.id,
                    ${this.table_name}.title,
                    ${this.table_name}.clinic_id,
                    row_to_json(ms)                                                                as medical_specialization,
                    json_build_object(
                            'id',
                            telephones.id,
                            'telephone',
                            telephones.telephone,
                            'code',
                            telephones."countryCode"
                    )                                                                          as telephone,
                    ${this.table_name}.email,
                    array_to_json(array_agg(row_to_json(cds)) FILTER ( WHERE cds.id is not null )) as schedules,
                    row_to_json(attachments) as avatar
            FROM ${this.table_name}
                         LEFT JOIN clinic_department_schedules cds on ${this.table_name}.id = cds.clinic_department_id
                         LEFT JOIN telephones on telephones.id = ${this.table_name}.telephone_id
                         LEFT JOIN (SELECT id, title, (${this.to_sql_string(CONFIGURATIONS.MEDICAL_SPECIALIZATION_ICON.BASEURL)} || icon_filename) as icon_url FROM medical_specializations) ms on ms.id = ${this.table_name}.medical_specialization_id
                         LEFT JOIN attachments on ${this.table_name}.attachment_id = attachments.id
            ${this.handle_filters(filters)}
            GROUP BY clinic_department.id, telephones.id, ms.*, attachments.id
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

export const clinic_department_api = new Api({
    table_name: 'clinic_department'
});
