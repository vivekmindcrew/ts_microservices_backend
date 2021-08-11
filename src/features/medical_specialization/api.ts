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
import {CONFIGURATIONS} from '../../config'

class Api extends base_api_image {

    private handle_filters({id}: filters_struct = {}) {
        const filterLiterals: string[] = [];
        if (id) filterLiterals.push(`${this.table_name}.id=${id}`);
        return filterLiterals.length ? `WHERE ${filterLiterals.join(' AND ')}` : ''
    }

    public async get_list({options: {filters, offset, limit}, client = db}: method_payload<get_records_payload>) {
        const sql = `
            SELECT id, title, (${this.to_sql_string(CONFIGURATIONS.MEDICAL_SPECIALIZATION_ICON.BASEURL)} || icon_filename) as icon_url from ${this.table_name}
            ${this.handle_filters(filters)}
            ${this.handle_limit(limit)}
            ${this.handle_offset(offset)}
        `;
        const {rows} = await client.query(sql);

        return rows;
    }
}

export const medical_specializations_api = new Api({
    table_name: 'medical_specializations'
});
