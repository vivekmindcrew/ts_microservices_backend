import {db} from "../../db";
import {
    base_api_image,
    method_payload
}
    from '../base_api_image'
import {
    get_records_payload,
    filters_struct
} from './types'

class Api extends base_api_image {

    private handle_filters({id}: filters_struct = {}) {
        const filterLiterals: string[] = [];
        if (id) filterLiterals.push(`${this.table_name}.id=${id}`);
        return filterLiterals.length ? `WHERE ${filterLiterals.join(' AND ')}` : ''
    }

    public async get_list({options: {filters, offset, limit, clinic_id}, client = db}: method_payload<get_records_payload>) {
        const sql = `
            SELECT ${this.table_name}.* from ${this.table_name}
            ${clinic_id ? `INNER JOIN clinic_sub_roles csr on sub_roles.id = csr.sub_role_id and csr.clinic_id = ${this.to_sql_string(clinic_id)}` : ''}
            ${this.handle_filters(filters)}
            ${this.handle_limit(limit)}
            ${this.handle_offset(offset)}
        `;

        const {rows} = await client.query(sql);

        return rows;
    }
}

export const sub_roles_api = new Api({
    table_name: 'sub_roles'
});
