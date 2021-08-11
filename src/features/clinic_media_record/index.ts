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

    private handle_filters({id, clinic_id, folder_id}: filter_struct) {
        const filter_literals = [];

        if (id) filter_literals.push(`${this.table_name}.id = ${id}`);
        if (clinic_id) filter_literals.push(`${this.table_name}.clinic_id = ${this.to_sql_string(clinic_id)}`);
        if (folder_id) filter_literals.push(`${this.table_name}.folder_id = ${folder_id}`);
        if (folder_id === null) filter_literals.push(`${this.table_name}.folder_id is null`);

        return filter_literals.length ? `WHERE ${filter_literals.join(' AND ')}` : ''
    }

    private handle_update_obj({display_name, folder_id, section, description}: update_obj_struct) {
        const update_literals = [];

        if (display_name) update_literals.push(`display_name = ${this.to_sql_string(display_name)}`);
        if (folder_id) update_literals.push(`folder_id = ${folder_id}`);
        if (section) update_literals.push(`section = ${this.to_sql_string(section)}`)
        if (description) update_literals.push(`description = ${this.to_sql_string(description)}`);

        return update_literals.length ? `SET ${update_literals.join()}` : ''
    }

    public insert_record({options: {display_name, clinic_id, created_by, folder_id, section, attachment_id, description}, client = db}: method_payload<insert_record_payload>) {
        const sql = `
            INSERT INTO ${this.table_name} (display_name, clinic_id, created_by, folder_id, section, attachment_id, description)
            VALUES ($1,$2,$3,$4,$5, $6, $7)
            RETURNING *
        `;

        return client.query(sql, [display_name, clinic_id, created_by, folder_id, section, attachment_id, description]).then(({rows}) => rows[0])
    }

    public get_record_list({options: {filters, limit, offset}, client = db}: method_payload<get_record_payload>) {
        const sql = `
                SELECT clinic_media_record.id,
                       clinic_media_record.section,
                       clinic_media_record.display_name,
                       clinic_media_record.description,
                       clinic_media_record.folder_id,
                       clinic_media_record.clinic_id,
                       clinic_media_record.created_at,
                       row_to_json(a) as attachment,
                       jsonb_build_object(
                               'id',
                               u.id,
                               'firstName',
                               u."firstName",
                               'lastName',
                               u."lastName"
                           )          as created_by
                from clinic_media_record
                         INNER JOIN attachments a on a.id = clinic_media_record.attachment_id
                         INNER JOIN users u on u.id = clinic_media_record.created_by
            ${this.handle_filters(filters)}
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
            RETURNING *
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

export const clinic_media_record_api = new Api({
    table_name: 'clinic_media_record'
});
