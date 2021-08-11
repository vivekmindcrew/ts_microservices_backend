import {db} from "../../db";
import {
    base_api_image,
    method_payload
} from '../base_api_image'
import {
    filter_struct,
    update_obj_struct,
    insert_record_payload,
    update_record_payload,
    delete_record_payload,
    get_record_payload,
    get_aggregated_records_list,
    get_aggregated_records_total_count,
    get_monitoring_patients_payload
} from './types'

import {CONFIGURATIONS} from '../../config'

class Api extends base_api_image {

    private handle_filters({id, clinic_id, alert_levels, alert_types, ids, patient_ids, search}: filter_struct) {
        const filter_literals = [];

        if (id) filter_literals.push(`${this.table_name}.id = ${id}`);
        if (Array.isArray(ids) && ids.length) filter_literals.push(`${this.table_name}.id IN (${ids.join()})`);
        if (Array.isArray(alert_types) && alert_types.length) filter_literals.push(`alerts.type IN (${alert_types.map(i => this.to_sql_string(i)).join()})`);
        if (Array.isArray(alert_levels) && alert_levels.length) filter_literals.push(`alerts.level IN (${alert_levels.map(i => this.to_sql_string(i)).join()})`);
        if (Array.isArray(patient_ids) && patient_ids.length) filter_literals.push(`clinic_monitoring_area_patients.user_id IN (${patient_ids.map(i => this.to_sql_string(i)).join()})`)
        if (search) filter_literals.push(`concat(u."firstName", ' ', u."lastName") ILIKE $search$%${search}%$search$`);

        if (clinic_id) filter_literals.push(`${this.table_name}.clinic_id = ${this.to_sql_string(clinic_id)}`);

        return filter_literals.length ? `WHERE ${filter_literals.join(' AND ')}` : ''
    }

    private handle_update_obj({name, email, medical_specialization_id, telephone_id, attachment_id}: update_obj_struct) {
        const update_literals = [];

        if (name) update_literals.push(`name = ${this.to_sql_string(name)}`);
        if (email) update_literals.push(`email = ${this.to_sql_string(email)}`);
        if (medical_specialization_id) update_literals.push(`medical_specialization_id = ${medical_specialization_id}`);
        if (telephone_id) update_literals.push(`telephone_id = ${this.to_sql_string(telephone_id)}`)
        if (attachment_id !== undefined) update_literals.push(`attachment_id = ${attachment_id ? this.to_sql_string(attachment_id) : 'null'}`)

        return update_literals.length ? `SET ${update_literals.join()}` : ''
    }

    public insert_record({options: {name, clinic_id, created_by, email, medical_specialization_id, telephone_id, attachment_id}, client = db}: method_payload<insert_record_payload>) {
        const sql = `
            INSERT INTO ${this.table_name} (name, clinic_id, created_by,email, medical_specialization_id, telephone_id, attachment_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING *
        `;

        return client.query(sql, [name, clinic_id, created_by, email, medical_specialization_id, telephone_id, attachment_id]).then(({rows}) => rows[0])
    }

    public get_record_list({options: {filters, limit, offset, checked_in_user_id}, client = db}: method_payload<get_record_payload>) {
        const sql = `
                SELECT clinic_monitoring_area.id,
                       clinic_monitoring_area.name,
                       clinic_monitoring_area.email,
                       row_to_json(ms)                                                                as medical_specialization,
                       json_build_object(
                               'id',
                               telephones.id,
                               'telephone',
                               telephones.telephone,
                               'code',
                               telephones."countryCode"
                           )                                                                          as telephone,
                       array_to_json(array_agg(row_to_json(mrs)) FILTER ( WHERE mrs.id is not null )) as schedules,
                       row_to_json(attachments) as avatar
                from clinic_monitoring_area
                         LEFT JOIN monitoring_area_schedules mrs on clinic_monitoring_area.id = mrs.monitoring_area_id
                         LEFT JOIN telephones on telephones.id = clinic_monitoring_area.telephone_id
                         LEFT JOIN (SELECT id, title, (${this.to_sql_string(CONFIGURATIONS.MEDICAL_SPECIALIZATION_ICON.BASEURL)} || icon_filename) as icon_url FROM medical_specializations) ms on ms.id = clinic_monitoring_area.medical_specialization_id
                         LEFT JOIN attachments on clinic_monitoring_area.attachment_id = attachments.id
            ${checked_in_user_id ? `INNER JOIN clinic_monitoring_area_stuff cmas on clinic_monitoring_area.id = cmas.monitoring_area_id and cmas.user_id = ${this.to_sql_string(checked_in_user_id)}` : ''}
            ${this.handle_filters(filters)}
            GROUP BY clinic_monitoring_area.id, telephones.id, ms.*, attachments.id
            ${this.handle_limit(limit)}
            ${this.handle_offset(offset)}
        `;
        return client.query(sql).then(({rows}) => rows)
    }

    public get_monitoring_aggregated_records({options: {filters, limit, offset}, client = db}: method_payload<get_aggregated_records_list>) {
        const sql = `
            SELECT json_build_object(
                           'id',
                           u.id,
                           'firstName',
                           u."firstName",
                           'lastName',
                           u."lastName",
                           'photo',
                           u.photo,
                           'dob',
                           u.dob
                       ) as user_info,
                   json_build_object(
                           'id',
                           clinic_monitoring_area.id,
                           'name',
                           clinic_monitoring_area.name
                       ) as monitoring_area_info,
                   json_build_object(
                          'id',
                          alerts.id,
                          'type',
                          alerts.type,
                          'level',
                          alerts.level,
                          'created_at',
                          alerts.created_at
                      )     as last_alert_info
            from clinic_monitoring_area_patients
                     INNER JOIN users u on u.id = clinic_monitoring_area_patients.user_id
                     INNER JOIN clinic_monitoring_area on clinic_monitoring_area.id = clinic_monitoring_area_patients.monitoring_area_id
                     LEFT JOIN LATERAL (
                       SELECT alerts.*
                       from alerts
                       where alerts.monitoring_area_id = clinic_monitoring_area.id
                         and alerts.patient_id = u.id
                       ORDER BY created_at DESC
                       LIMIT 1
                   )     alerts on true
            ${this.handle_filters(filters)}
            ORDER BY alerts.level ASC NULLS LAST
            ${this.handle_limit(limit)}
            ${this.handle_offset(offset)}
        `;

        return client.query(sql).then(({rows}) => rows)
    }

    public get_monitoring_aggregated_records_total_count({options: {filters}, client = db}: method_payload<get_aggregated_records_total_count>) {
        const sql = `
            SELECT count(clinic_monitoring_area_patients)
            from clinic_monitoring_area_patients
                     INNER JOIN users u on u.id = clinic_monitoring_area_patients.user_id
                     INNER JOIN clinic_monitoring_area on clinic_monitoring_area.id = clinic_monitoring_area_patients.monitoring_area_id
                     LEFT JOIN LATERAL (
                       SELECT alerts.*
                       from alerts
                       where alerts.monitoring_area_id = clinic_monitoring_area.id
                         and alerts.patient_id = u.id
                       ORDER BY created_at DESC
                       LIMIT 1
                   )     alerts on true
            ${this.handle_filters(filters)}
        `;

        return client.query(sql).then(({rows}) => rows[0] && rows[0].count || 0)
    }

    public update_record({options: {filters, update_obj}, client = db}: method_payload<update_record_payload>) {
        const sql = `
            UPDATE ${this.table_name}
            ${this.handle_update_obj(update_obj)}
            ${this.handle_filters(filters)}
            RETURNING *
        `;

        return client.query(sql).then(({rows}) => rows)
    }

    public delete_record({options: {filters}, client = db}: method_payload<delete_record_payload>) {
        const sql = `
            DELETE FROM ${this.table_name}
            ${this.handle_filters(filters)}
        `;

        return client.query(sql);
    }

    public get_monitoring_patients({options: {filters}, client = db}: method_payload<get_monitoring_patients_payload>) {
        const sql = `
            SELECT u.id,
                   u."firstName",
                   u."lastName",
                   u.photo
            from clinic_monitoring_area_patients
                     INNER JOIN users u on u.id = clinic_monitoring_area_patients.user_id
                     INNER JOIN clinic_monitoring_area
                                on clinic_monitoring_area.id = clinic_monitoring_area_patients.monitoring_area_id
            ${this.handle_filters(filters)}
            GROUP BY u.id
        `;

        return client.query(sql).then(({rows}) => rows)
    }
}

export const clinic_monitoring_area_api = new Api({
    table_name: 'clinic_monitoring_area'
});
