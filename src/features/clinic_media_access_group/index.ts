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

    private handle_filters({id, created_by, type}: filter_struct) {
        const filter_literals = [];

        if (id) filter_literals.push(`${this.table_name}.id = ${id}`);
        if (created_by) filter_literals.push(`${this.table_name}.created_by = ${this.to_sql_string(created_by)}`);
        if (type) filter_literals.push(`${this.table_name}.type = ${this.to_sql_string(type)}`);

        return filter_literals.length ? `WHERE ${filter_literals.join(' AND ')}` : ''
    }

    private handle_update_obj({display_name, avatar_id, type}: update_obj_struct) {
        const update_literals = [];

        if (display_name) update_literals.push(`display_name = ${this.to_sql_string(display_name)}`);
        if (avatar_id) update_literals.push(`avatar_id = ${this.to_sql_string(avatar_id)}`);
        if (type) update_literals.push(`type = ${this.to_sql_string(type)}`);

        return update_literals.length ? `SET ${update_literals.join()}` : ''
    }

    public insert_record({options: {display_name, created_by, avatar_id, type}, client = db}: method_payload<insert_record_payload>) {
        const sql = `
            INSERT INTO ${this.table_name} (display_name, created_by, avatar_id, type)
            VALUES ($1,$2,$3,$4)
            RETURNING *
        `;

        return client.query(sql, [display_name, created_by, avatar_id, type]).then(({rows}) => rows[0])
    }

    public get_record_list({options: {filters, limit, offset}, client = db}: method_payload<get_record_payload>) {
        const sql = `
            SELECT clinic_media_access_group.id,
                   clinic_media_access_group.display_name,
                   clinic_media_access_group.created_at,
                   row_to_json(attachments) as avatar,
                   clinic_media_access_group.type
            from clinic_media_access_group
                     LEFT JOIN attachments on clinic_media_access_group.avatar_id = attachments.id
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

export const clinic_media_access_group_api = new Api({
    table_name: 'clinic_media_access_group'
});
