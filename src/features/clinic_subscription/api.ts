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

    private handle_filters({clinic_id, id}: filters_struct = {}) {
        const filterLiterals: string[] = [];
        if (id) filterLiterals.push(`${this.table_name}.id=${id}`);
        if (clinic_id) filterLiterals.push(`${this.table_name}.clinic_id = ${this.to_sql_string(clinic_id)}`);
        return filterLiterals.length ? `WHERE ${filterLiterals.join(' AND ')}` : ''
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

export const clinic_subscription_api = new Api({
    table_name: 'clinic_subscription'
});
