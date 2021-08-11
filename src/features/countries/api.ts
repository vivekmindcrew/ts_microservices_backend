import {
    base_api_image,
    method_payload
} from '../base_api_image'
import {db} from "../../db";

class Api extends base_api_image {

    public get_user_country_info({options: user_id, client = db}: method_payload<string>) {
        const sql = `
            SELECT c.* from ${this.table_name} c
            LEFT JOIN users u on (u."countryId" = c.id)
            WHERE u.id = $1
        `;
        return db.query(sql, [user_id]).then(({rows}) => rows[0]);
    }

    public get_country_info({options: country_iso3_code, client = db}: method_payload<string>) {
        const sql = `
            SELECT c.* from ${this.table_name} c
            WHERE c."iso3Code" = $1
        `;

        return db.query(sql, [country_iso3_code.toUpperCase()]).then(({rows}) => rows[0]);
    }

}

export const countries_api = new Api({
    table_name: 'countries'
});
