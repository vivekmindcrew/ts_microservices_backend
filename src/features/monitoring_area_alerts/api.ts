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

    private handle_filters({monitoring_area_id, patient_id}: filters_struct = {}) {
        const filterLiterals: string[] = [];
        if (monitoring_area_id) filterLiterals.push(`${this.table_name}.monitoring_area_id=${monitoring_area_id}`);
        if (patient_id) filterLiterals.push(`${this.table_name}.patient_id = ${this.to_sql_string(patient_id)}`);
        return filterLiterals.length ? `WHERE ${filterLiterals.join(' AND ')}` : ''
    }

    public async get_list({options: {filters, offset, limit, reviewed}, client = db}: method_payload<get_records_payload>) {

        const filters_literal = this.handle_filters(filters)

        const sql = `
            SELECT ${this.table_name}.id,
                   ${this.table_name}.type,
                   ${this.table_name}.level,
                   ${this.table_name}.created_at,
                   row_to_json(u) as patient,
                   review is not null as reviewed
            FROM ${this.table_name}
                   INNER JOIN users u on ${this.table_name}.patient_id = u.id
                   LEFT JOIN LATERAL (SELECT * from alert_reviews WHERE alert_id = alerts.id LIMIT 1) review on true
            ${filters_literal} ${typeof reviewed === "boolean" ? filters_literal ? `AND review is ${reviewed ? 'not' : ''} null` : `WHERE review review is ${reviewed ? 'not' : ''} null` : ''}
            ORDER BY alerts.created_at DESC 
            ${this.handle_limit(limit)}
            ${this.handle_offset(offset)}
        `;

        const {rows} = await client.query(sql);

        return rows;
    }
}

export const monitoring_area_alerts_api = new Api({
    table_name: 'alerts'
});
