import {
    base_api_image
} from '../base_api_image'
import {db} from "../../db";
import {ACCESS_ROLES} from "../../constants"

class Api extends base_api_image {

    public async get_sysadmins() {
        const sql = `
            SELECT u.* from ${this.table_name} u
            LEFT JOIN roles r on (u."roleId" = r.id)
            WHERE r.name = $1
        `;
        return db.query(sql, [ACCESS_ROLES.system_admin]).then(({rows}) => rows);
    }


}

export const sysadmins_api = new Api({
    table_name: 'users'
});
