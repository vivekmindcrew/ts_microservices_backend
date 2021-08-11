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
    private handle_filters({user_id, clinic_id}: filters_struct) {
        const filter_literals = [];

        if (user_id) filter_literals.push(`${this.table_name}.user_id = ${this.to_sql_string(user_id)}`);
        if (clinic_id) filter_literals.push(`${this.table_name}.clinic_id = ${this.to_sql_string(clinic_id)}`);

        return filter_literals.length ? `WHERE ${filter_literals.join(' AND ')}` : ''
    }

    public async upsert_record({options: {user_id, clinic_id}, client = db}: method_payload<upsert_record_payload>) {
        const sql = `
            INSERT INTO ${this.table_name} (user_id, clinic_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, clinic_id)
                DO UPDATE
                    SET updated_at = now()
            RETURNING *
        `;

        return client.query(sql, [user_id, clinic_id]).then(({rows}) => rows[0]);
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
            SELECT c.id,
                   c.name,
                   CASE
                   WHEN (c.logo_id IS NOT NULL) THEN json_build_object(
                      'id',
                      a.id,
                      'url',
                      a.source_url
                     )
                   ELSE NULL END as logo,
                   c.clinic_tz,
                   c.org_code,
                   row_to_json(addresses) as address
            from user_favourites_clinic
                   INNER JOIN clinics c on user_favourites_clinic.clinic_id = c.id
                   LEFT JOIN attachments a ON c.logo_id = a.id
                   INNER JOIN addresses on c."addressId" = addresses.id
            ${this.handle_filters(filters)}
        `;

        return client.query(sql).then(({rows}) => rows)
    }
}

export const user_favourites_clinic_api = new Api({
    table_name: 'user_favourites_clinic'
});
