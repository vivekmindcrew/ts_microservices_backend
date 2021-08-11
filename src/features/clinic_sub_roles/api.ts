import {db} from "../../db";
import {
    base_api_image,
    method_payload
}
    from '../base_api_image'
import {
    get_records_payload,
    filters_struct,
    upsert_record_payload
} from './types'

class Api extends base_api_image {

    private handle_filters({clinic_id, sub_role_id}: filters_struct = {}) {
        const filterLiterals: string[] = [];
        if (sub_role_id) filterLiterals.push(`${this.table_name}.sub_role_id=${sub_role_id}`);
        if (clinic_id) filterLiterals.push(`${this.table_name}.clinic_id = ${this.to_sql_string(clinic_id)}`);
        return filterLiterals.length ? `WHERE ${filterLiterals.join(' AND ')}` : ''
    }

    public async upsert_record({options: {clinic_id, sub_role_id}, client = db}: method_payload<upsert_record_payload>) {
        const sql = `
            INSERT INTO clinic_sub_roles (clinic_id, sub_role_id)
            VALUES ($1, $2)
            ON CONFLICT (clinic_id, sub_role_id) DO UPDATE SET sub_role_id = EXCLUDED.sub_role_id
            RETURNING *
        `;

        return client.query(sql, [clinic_id, sub_role_id]).then(({rows}) => rows[0]);
    }

    public async get_list({options: {filters, offset, limit}, client = db}: method_payload<get_records_payload>) {
        const sql = `
            SELECT * from ${this.table_name}
            ${this.handle_filters(filters)}
            ${this.handle_limit(limit)}
            ${this.handle_offset(offset)}
        `;

        const {rows} = await client.query(sql);

        return rows;
    }
}

export const clinic_sub_roles_api = new Api({
    table_name: 'clinic_sub_roles'
});
