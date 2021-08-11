import {db} from "../../db";
import {
    base_api_image,
    method_payload
} from '../base_api_image'
import {
    create_record_payload,
    get_list_payload,
    get_clinics_patient_payload,
    get_clinic_patient_total_count_payload
} from './types'

class Api extends base_api_image {
    public create_record({options: {user_id, clinic_id}, client = db}: method_payload<create_record_payload>) {
        const sql = `
            INSERT INTO ${this.table_name} (user_id, clinic_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, clinic_id)
            DO NOTHING
            RETURNING *
        `;

        return client.query(sql, [user_id, clinic_id]);
    }

    public get_list({options: {user_id}, client = db}: method_payload<get_list_payload>) {
        const sql = `
            SELECT c.id,
                   c.org_code,
                   c.name,
                   (SELECT coalesce(avg(score), 0) from patient_feedback_records where patient_feedback_records.clinic_id = c.id ) as avg_score,
                   CASE
                    WHEN (c.logo_id IS NOT NULL) THEN json_build_object(
                        'id',
                        ca.id,
                        'url',
                        ca.source_url
                        )
                    ELSE NULL END as logo,
                   json_build_object(
                       'postal',
                       a.postal,
                       'city',
                       a.city,
                       'street',
                       a.street,
                       'buildingNumber',
                       a."buildingNumber",
                       'apartment',
                       a.apartment,
                       'latitude',
                       a.latitude,
                       'longitude',
                       a.longitude,
                       'country',
                       json_build_object(
                           'iso3code',
                           ac."iso3Code",
                           'name',
                           ac.name
                         )
                     ) as address
            FROM user_to_clinics
                   INNER JOIN clinics c on user_to_clinics.clinic_id = c.id
                   LEFT JOIN attachments ca on c.logo_id = ca.id
                   INNER JOIN addresses a on c."addressId" = a.id
                   INNER JOIN countries ac on ac.id = a."countryId"
            WHERE user_to_clinics.user_id = $1
            GROUP BY c.id, a.id, ac.id, ca.id
        `;

        return client.query(sql, [user_id]).then(({rows}) => rows);
    }

    public get_clinic_patients({options: {clinic_id, limit, offset, search}, client = db}: method_payload<get_clinics_patient_payload>) {
        const sql = `
            SELECT u.id,
                   u."firstName",
                   u."lastName",
                   u.photo,
                   u.blood_type,
                   u.rh,
                   json_build_object(
                       'id',
                       telephones.id,
                       'telephone',
                       telephones.telephone
                     )   as telephone,
                   CASE
                     WHEN addresses IS NULL THEN NULL
                     ELSE json_build_object(
                         'city',
                         addresses.city,
                         'street',
                         addresses.street,
                         'buildingNumber',
                         addresses."buildingNumber",
                         'postal',
                         addresses.postal,
                         'latitude',
                         addresses.latitude,
                         'longitude',
                         addresses.longitude,
                         'country',
                         CASE
                           WHEN countries.id IS NULL THEN NULL
                           ELSE json_build_object('id', countries.id, "iso3Code", countries."iso3Code", 'name', countries.name)
                           END
                       )
                     END as address,
                  CASE WHEN e.id IS NOT NULL  then json_build_object(
                       'id',
                       e.id,
                       'email',
                       e.email
                  ) else null 
                  end as email
            FROM ${this.table_name}
                   INNER JOIN users u on ${this.table_name}.user_id = u.id
                   INNER JOIN roles on u."roleId" = roles.id AND roles.id = 1
                   INNER JOIN telephones on u."telephoneId" = telephones.id
                   LEFT JOIN emails e on u.id = e."userId"
                   LEFT JOIN addresses on addresses.id = u."addressId"
                   LEFT JOIN countries on addresses."countryId" = countries.id
            WHERE ${this.table_name}.clinic_id = $1
            ${search && search.length ?
            `
                    AND (
                        concat(u."firstName", ' ', u."lastName") ILIKE '%${search.trim()}%'
                        OR telephones.telephone LIKE '%${search.trim()}%'
                    )`
            : ''}
            ${this.handle_limit(limit)}
            ${this.handle_offset(offset)}
        `;

        return client.query(sql, [clinic_id]).then(({rows}) => rows);
    }

    public get_clinic_patients_total_count({options: {clinic_id, search}, client = db}: method_payload<get_clinic_patient_total_count_payload>) {
        const sql = `
            SELECT count(*) 
            from ${this.table_name}
            INNER JOIN users u on ${this.table_name}.user_id = u.id
            INNER JOIN roles on u."roleId" = roles.id AND roles.id = 1
            INNER JOIN telephones on u."telephoneId" = telephones.id
            WHERE ${this.table_name}.clinic_id = $1
            ${search && search.length ?
            `
                    AND (
                        concat(u."firstName", ' ', u."lastName") ILIKE '%${search.trim()}%'
                        OR telephones.telephone LIKE '%${search.trim()}%'
                    )`
            : ''}
        `;

        return client.query(sql, [clinic_id]).then(({rows}) => rows[0].count);
    }

    public async delete_record({options: {user_id, clinic_id}, client = db}: method_payload<create_record_payload>) {
        const sql = `
            DELETE FROM ${this.table_name}
            WHERE user_id = $1 AND clinic_id = $2
            RETURNING *
        `;

        const records = await client.query(sql, [user_id, clinic_id]).then(({rows}) => rows);

        return {
            success: records.length > 0
        }
    }

}

export const users_to_clinics_api = new Api({
    table_name: 'user_to_clinics'
});
