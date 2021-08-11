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

    private handle_filters({clinic_id}: filters_struct = {}) {
        const filterLiterals: string[] = [];
        if (clinic_id) filterLiterals.push(`${this.table_name}.clinic_id = ${this.to_sql_string(clinic_id)}`);
        return filterLiterals.length ? `WHERE ${filterLiterals.join(' AND ')}` : ''
    }

    public async upsert_record({options: {clinic_id, consultation_price, home_visit_price, online_consultation_price}, client = db}: method_payload<upsert_record_payload>) {
        const sql = `
            INSERT INTO clinics_prices (clinic_id, consultation_price, home_visit_price, online_consultation_price)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (clinic_id) DO UPDATE SET consultation_price = EXCLUDED.consultation_price, home_visit_price = EXCLUDED.home_visit_price, online_consultation_price = EXCLUDED.online_consultation_price
            RETURNING *
        `;

        return client.query(sql, [clinic_id, consultation_price, home_visit_price, online_consultation_price]).then(({rows}) => rows[0]);
    }

    public async get_list({options: {filters}, client = db}: method_payload<get_records_payload>) {
        const sql = `
            SELECT clinics_prices.id,
                   clinics_prices.consultation_price,
                   clinics_prices.home_visit_price,
                   clinics_prices.online_consultation_price,
                   json_build_object(
                       'id',
                       c.id,
                       'name',
                       c.name
                       ) as clinic,
                   row_to_json(c2) as currency
            from clinics_prices
            INNER JOIN clinics c on clinics_prices.clinic_id = c.id
            INNER JOIN currency_to_country ctc on c."countryId" = ctc.country_id
            INNER JOIN currencies c2 on ctc.currency_id = c2.id
            ${this.handle_filters(filters)}
        `;

        const {rows} = await client.query(sql);

        return rows;
    }
}

export const clinics_prices_api = new Api({
    table_name: 'clinics_prices'
});
