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

    private handle_filters({id, clinic_id, parent_folder_id}: filter_struct) {
        const filter_literals = [];

        if (id) filter_literals.push(`${this.table_name}.id = ${id}`);
        if (clinic_id) filter_literals.push(`${this.table_name}.clinic_id = ${this.to_sql_string(clinic_id)}`);
        if (parent_folder_id) filter_literals.push(`${this.table_name}.parent_folder_id = ${parent_folder_id}`);
        if (parent_folder_id === null) filter_literals.push(`${this.table_name}.parent_folder_id is null`);

        return filter_literals.length ? `WHERE ${filter_literals.join(' AND ')}` : ''
    }

    private handle_update_obj({display_name, parent_folder_id, section, access_group_id, access_type, allowed_user_ids}: update_obj_struct) {
        const update_literals = [];

        if (display_name) update_literals.push(`display_name = ${this.to_sql_string(display_name)}`);
        if (parent_folder_id) update_literals.push(`parent_folder_id = ${parent_folder_id}`);
        if (section) update_literals.push(`section = ${this.to_sql_string(section)}`);
        if (access_group_id) update_literals.push(`access_group_id = ${access_group_id}`);
        if (access_type) update_literals.push(`access_type = ${this.to_sql_string(access_type)}`);
        if (allowed_user_ids && allowed_user_ids.length) update_literals.push(`allowed_user_ids = $1`);
        if(allowed_user_ids=== null) update_literals.push(`allowed_user_ids = null`)

        return update_literals.length ? `SET ${update_literals.join()}` : ''
    }

    public insert_record({options: {display_name, clinic_id, created_by, parent_folder_id, section}, client = db}: method_payload<insert_record_payload>) {
        const sql = `
            INSERT INTO ${this.table_name} (display_name, clinic_id, created_by, parent_folder_id, section)
            VALUES ($1,$2,$3,$4,$5)
            RETURNING *
        `;

        return client.query(sql, [display_name, clinic_id, created_by, parent_folder_id, section]).then(({rows}) => rows[0])
    }

    public get_record_list({options: {filters, limit, user_id, offset}, client = db}: method_payload<get_record_payload>) {
        const sql = `
            SELECT clinic_media_folder.id,
                   clinic_media_folder.section,
                   clinic_media_folder.display_name,
                   clinic_media_folder.parent_folder_id,
                   clinic_media_folder.clinic_id,
                   clinic_media_folder.created_at,
                   clinic_media_folder.access_type,
                   clinic_media_folder.access_group_id,
       CASE
           WHEN (clinic_media_folder.allowed_user_ids is not null) then (SELECT 
                array_to_json(
                    array_agg(
                        json_build_object('id',
                                       users.id,
                                       'firstName',
                                       users."firstName",
                                       'lastName',
                                       users."lastName",
                                       'photo',
                                       users.photo)
                        )
                   )
                                                                         from users
                                                                         where users.id = ANY (clinic_media_folder.allowed_user_ids))
           ELSE null END as allowed_users,
                   jsonb_build_object(
                           'id',
                           u.id,
                           'firstName',
                           u."firstName",
                           'lastName',
                           u."lastName"
                       ) as created_by
            from clinic_media_folder
                     INNER JOIN users u on u.id = clinic_media_folder.created_by
                     LEFT JOIN clinic_media_access_group_participant cmagp
                               on clinic_media_folder.access_group_id = cmagp.group_id and
                                  cmagp.user_id = $1
            ${this.handle_filters(filters)} and (clinic_media_folder.access_type = 'public'
               or clinic_media_folder.created_by = $1
               or (clinic_media_folder.access_type = 'specific_users' and
                   $1 = any (clinic_media_folder.allowed_user_ids))
               or (clinic_media_folder.access_type in ('specific_doctor_group', 'specific_patient_group') and cmagp.user_id is not null))
            ${this.handle_limit(limit)}
            ${this.handle_offset(offset)}
        `;

        return client.query(sql, [user_id]).then(({rows}) => rows)
    }

    public update_record({options: {filters, update_obj}, client = db}: method_payload<update_record_payload>) {
        const sql = `
            UPDATE ${this.table_name}
            ${this.handle_update_obj(update_obj)}
            ${this.handle_filters(filters)}
            RETURNING *
        `;

        return client.query(sql, update_obj.allowed_user_ids && update_obj.allowed_user_ids.length ? [update_obj.allowed_user_ids] : []).then(({rows}) => rows)
    }

    public delete_record({options: {filters}, client = db}: method_payload<delete_record_payload>) {
        const sql = `
            DELETE FROM ${this.table_name}
            ${this.handle_filters(filters)}
        `;

        return client.query(sql);
    }
}

export const clinic_media_folder_api = new Api({
    table_name: 'clinic_media_folder'
});
