import { base_api_image, method_payload } from '../base_api_image'
import {
  create_record_payload,
  delete_record_payload,
  filters_struct,
  update_obj_struct,
  update_record_payload,
  get_user_specializations_struct,
  get_clinics_professionals_payload,
  get_records_payload,
  get_doctor_ids_by_specialization_payload,
  change_department_payload,
  doctors_by_clinic_payload,
  get_all_responsible_persons_payload
} from './types'
import { db } from '../../db'
import { CONFIGURATIONS } from '../../config'
class Api extends base_api_image {
  private handle_filters({
    user_id,
    clinic_id,
    medical_specialization_id,
    is_active,
    is_admin
  }: filters_struct) {
    const filterLiterals: string[] = []

    if (user_id)
      filterLiterals.push(
        `${this.table_name}.user_id = ${this.to_sql_string(user_id)}`
      )
    if (clinic_id)
      filterLiterals.push(
        `${this.table_name}.clinic_id = ${this.to_sql_string(clinic_id)}`
      )
    if (medical_specialization_id)
      filterLiterals.push(
        `${this.table_name}.medical_specialization_id = ${medical_specialization_id}`
      )
    if (typeof is_active === 'boolean')
      filterLiterals.push(`${this.table_name}.is_active = ${is_active}`)
    if (typeof is_admin === 'boolean')
      filterLiterals.push(`${this.table_name}.is_admin = ${is_admin}`)

    return filterLiterals.length ? `WHERE ${filterLiterals.join(' AND ')}` : ''
  }

  private handle_update_obj({
    is_admin,
    is_active,
    verified,
    department_id
  }: update_obj_struct) {
    const update_terms = []

    if (typeof is_active === 'boolean') {
      update_terms.push(`is_active = ${is_active}`)
    }
    if (typeof is_admin === 'boolean') {
      update_terms.push(`is_admin = ${is_admin}`)
    }
    if (typeof verified === 'boolean') {
      update_terms.push(`verified = ${verified}`)
    }

    if (department_id) {
      update_terms.push(`department_id = ${department_id}`)
    }

    return update_terms.length ? `SET ${update_terms.join(',')}` : ''
  }

  public async get_records({
    options: { filters },
    client = db
  }: method_payload<get_records_payload>) {
    const sql = `
            SELECT * from ${this.table_name}
            ${this.handle_filters(filters)}
        `

    return client.query(sql).then(({ rows }) => rows)
  }

  public async create_record({
    options: {
      user_id,
      clinic_id,
      medical_level_id,
      medical_specialization_id,
      corporate_email = null,
      corporate_phone_id = null,
      chat_allowed,
      audio_call_allowed,
      contact_directly_allowed,
      video_call_allowed,
      certificate_number,
      certificate,
      department_id,
      sub_role_id
    },
    client = db
  }: method_payload<create_record_payload>) {
    const sql = `
            INSERT INTO ${this.table_name} (user_id, clinic_id, medical_specialization_id, medical_level_id, chat_allowed, audio_call_allowed, contact_directly_allowed, video_call_allowed, corporate_email, corporate_phone_id, certificate, certificate_number,department_id, sub_role_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            RETURNING *
        `

    const {
      rows: [record]
    } = await client.query(sql, [
      user_id,
      clinic_id,
      medical_specialization_id || null,
      medical_level_id || null,
      !!chat_allowed,
      !!audio_call_allowed,
      !!contact_directly_allowed,
      !!video_call_allowed,
      corporate_email,
      corporate_phone_id,
      certificate,
      certificate_number,
      department_id || null,
      sub_role_id || null
    ])

    return record
  }

  public async update_record({
    options: { filters, update_obj },
    client = db
  }: method_payload<update_record_payload>) {
    const sql = `
            UPDATE ${this.table_name}
            ${this.handle_update_obj(update_obj)}
             ${this.handle_filters(filters)}
            RETURNING *
        `

    return client.query(sql)
  }

  public async delete_record({
    options,
    client = db
  }: method_payload<delete_record_payload>) {
    const sql = `
            DELETE FROM ${this.table_name}
            ${this.handle_filters(options)}
        `

    return client.query(sql)
  }

  public async get_users_specializations({
    options,
    client = db
  }: method_payload<get_user_specializations_struct>) {
    const sql = `
            SELECT ${this.table_name}.corporate_email,
                   ${this.table_name}.chat_allowed,
                   ${this.table_name}.audio_call_allowed,
                   ${this.table_name}.video_call_allowed,
                   ${this.table_name}.contact_directly_allowed,
                   ${this.table_name}.is_active,
                   ${this.table_name}.is_admin,
                   (SELECT coalesce(avg(score), 0) from patient_feedback_records where patient_feedback_records.clinic_id = ${this.table_name
      }.clinic_id ) as avg_score,
                   (SELECT coalesce(sum(1),0) from patient_feedback_records where patient_feedback_records.clinic_id = ${this.table_name
      }.clinic_id) as feedback_count,
                    CASE WHEN (${this.table_name}.certificate IS NOT NULL)
                    THEN json_build_object(
                        'attachment', 
                        (SELECT row_to_json(a) FROM attachments a where a.id = ${this.table_name
      }.certificate),
                        'certificate_number',
                        ${this.table_name}.certificate_number
                        )
                    ELSE NULL
                    END as certificate,
                   CASE WHEN (${this.table_name}.corporate_phone_id IS NOT NULL)
                       THEN (array_agg(
                                json_build_object(
                                'code',
                                telephones."countryCode",
                                'number',
                                telephones.number,
                                'telephone',
                                telephones.telephone
                                )
                       )) [ 1]
                       ELSE NULL
                   END as corporate_phone,
                   (array_agg(
                       row_to_json(medical_specializations)
                     )) [ 1]      as medical_specialization,
                   (array_agg(
                        row_to_json(medical_levels)
                     )) [ 1]      as medical_level,
                   (
                             SELECT array_to_json(array_agg(row_to_json(shift)))
                             FROM (
                                    SELECT array_to_json(array_agg(EXTRACT(DAY from start - to_timestamp(0)))) as days,
                                           (array_agg(TO_CHAR(start - to_timestamp(0), 'HH24:MI:SS'))) [ 1]    as start,
                                           (array_agg(TO_CHAR(finish - to_timestamp(0), 'HH24:MI:SS'))) [ 1]   as finish,
                                           CASE WHEN (array_agg(consultation_slot_from))[ 1] IS NOT NULL
                                            THEN json_build_object(
                                                'from',
                                                to_char((array_agg(consultation_slot_from - to_timestamp(0)))[ 1], 'HH24:MI:SS'),
                                                'to',
                                                to_char((array_agg(consultation_slot_to -  to_timestamp(0)))[ 1],  'HH24:MI:SS'),
                                                'time_slot',
                                                EXTRACT (EPOCH FROM (array_agg(consultation_slot_interval  ))[ 1]) / 60
                                            )
                                            ELSE NULL
                                            END as consultation_slot,
                                            CASE WHEN (array_agg(home_visit_slot_from))[ 1] IS NOT NULL
                                            THEN json_build_object(
                                                'from',
                                                to_char((array_agg(home_visit_slot_from - to_timestamp(0)))[ 1], 'HH24:MI:SS'),
                                                'to',
                                                to_char((array_agg(home_visit_slot_to - to_timestamp(0)))[ 1],  'HH24:MI:SS'),
                                                'time_slot',
                                                EXTRACT (EPOCH FROM (array_agg(home_visit_slot_interval))[ 1]) / 60
                                            )
                                            ELSE NULL
                                            END as home_visit_slot,
                                            CASE WHEN (array_agg(online_slot_from))[ 1] IS NOT NULL
                                            THEN json_build_object(
                                                'from',
                                                to_char((array_agg(online_slot_from - to_timestamp(0)))[ 1], 'HH24:MI:SS'),
                                                'to',
                                                to_char((array_agg(online_slot_to - to_timestamp(0)))[ 1],  'HH24:MI:SS'),
                                                'time_slot',
                                                EXTRACT (EPOCH FROM (array_agg(online_slot_interval))[ 1]) / 60
                                            )
                                            ELSE NULL
                                            END as online_slot
                                    FROM clinic_position_schedule cps
                                    WHERE clinic_positions.user_id = cps.user_id
                                      AND
                                      clinic_positions.clinic_id = cps.clinic_id
                                    GROUP BY user_id, clinic_id, stack_id
                                  ) as shift
                             )   as shifts,
                   (array_agg(
                       json_build_object(
                           'id',
                           clinics.id,
                           'name',
                           clinics.name,
                           'logo',
                           CASE
                           WHEN (clinics.logo_id IS NOT NULL) THEN json_build_object(
                              'id',
                              attachments.id,
                              'url',
                              attachments.source_url
                             )
                           ELSE NULL END,
                           'address',
                           (SELECT row_to_json(addresses) FROM addresses WHERE id = clinics."addressId"),
                           'members_total_count',
                           (SELECT count(*) FROM ${this.table_name
      } cp INNER JOIN users u ON u.id = cp.user_id AND u."deletedAt" IS NULL WHERE cp.clinic_id = ${this.table_name
      }.clinic_id)
                         )
                     )) [ 1]      as clinic,
                     CASE
                     WHEN ${this.table_name}.department_id IS NOT NULL
                       THEN json_build_object(
                         'id',
                         cd.id,
                         'title',
                         cd.title
                       )
                     ELSE NULL
                    END                            as department,
                   row_to_json(sr) as sub_role
            FROM ${this.table_name}
                   INNER JOIN sub_roles sr on ${this.table_name
      }.sub_role_id = sr.id
                   INNER JOIN clinics ON ${this.table_name
      }.clinic_id = clinics.id
                   LEFT JOIN clinic_department cd on ${this.table_name
      }.department_id = cd.id
                   LEFT JOIN attachments ON clinics.logo_id = attachments.id
                   LEFT JOIN medical_levels ON ${this.table_name
      }.medical_level_id = medical_levels.id
                   LEFT JOIN (SELECT id, title, (${this.to_sql_string(
        CONFIGURATIONS.MEDICAL_SPECIALIZATION_ICON.BASEURL
      )} || icon_filename) as icon_url FROM medical_specializations) medical_specializations ON ${this.table_name
      }.medical_specialization_id = medical_specializations.id
                   LEFT JOIN telephones ON ${this.table_name
      }.corporate_phone_id = telephones.id
            ${this.handle_filters(options)}
            GROUP BY ${this.table_name}.user_id, ${this.table_name
      }.clinic_id, cd.id, ${this.table_name}.medical_specialization_id, sr.id;
        `
    const { rows } = await client.query(sql)

    return rows
  }

  public async get_clinics_professionals({
    options: {
      clinic_id,
      search,
      limit,
      offset,
      medical_specialization_ids,
      rating_from,
      rating_to
    },
    client = db
  }: method_payload<get_clinics_professionals_payload>) {
    const sql = `
            SELECT u.id,
                   u."firstName",
                   u."lastName",
                   u.photo,
                   CASE WHEN (ml.id IS NOT NULL) THEN row_to_json(ml) ELSE NULL end                  as medical_level,
                   CASE WHEN (med_s.id IS NOT NULL) THEN row_to_json(med_s) ELSE NULL end              as medical_specialization,
                   ${this.table_name}.is_active     as is_active,
                   ${this.table_name}.is_admin      as is_admin,
                   ${this.table_name}.corporate_email as corporate_email,
                   CASE
                     WHEN telephones.id IS NOT NULL
                       THEN json_build_object(
                         'code',
                         telephones."countryCode",
                         'number',
                         telephones.number,
                         'telephone',
                         telephones.telephone
                       )
                     ELSE NULL
                    END                            as corporate_telephone,
                    CASE
                     WHEN ${this.table_name}.department_id IS NOT NULL
                       THEN json_build_object(
                         'id',
                         cd.id,
                         'title',
                         cd.title
                       )
                     ELSE NULL
                    END                            as department,
                    avg_score.value as avg_score,
                    row_to_json(sr) as sub_role
            FROM ${this.table_name}
                   INNER JOIN sub_roles sr on clinic_positions.sub_role_id = sr.id
                   INNER JOIN users u ON ${this.table_name
      }.user_id = u.id AND u."deletedAt" IS NULL
                        ${search && search.length
        ? `AND concat("firstName", ' ', "lastName") ILIKE '%${search.trim()}%'`
        : ''
      }
                   LEFT JOIN telephones ON ${this.table_name
      }.corporate_phone_id = telephones.id
                   LEFT JOIN medical_levels ml on ${this.table_name
      }.medical_level_id = ml.id
                   LEFT JOIN medical_specializations med_s on ${this.table_name
      }.medical_specialization_id = med_s.id
                   LEFT JOIN clinic_department cd on ${this.table_name
      }.department_id = cd.id
                   LEFT JOIN LATERAL (SELECT coalesce(avg(score), 0) as value from patient_feedback_records where doctor_id = ${this.table_name
      }.user_id and clinic_id = ${this.table_name
      }.clinic_id ) as avg_score on true
            WHERE ${this.table_name}.clinic_id = $1 
                ${Array.isArray(medical_specialization_ids) &&
        medical_specialization_ids.length
        ? `AND ${this.table_name
        }.medical_specialization_id in (${medical_specialization_ids.join(
          ','
        )})`
        : ''
      }
                ${typeof rating_from === 'number'
        ? `AND avg_score.value >= ${rating_from}`
        : ''
      }
                ${typeof rating_to === 'number'
        ? `AND avg_score.value <= ${rating_to}`
        : ''
      }
            ${this.handle_limit(limit)}
            ${this.handle_offset(offset)}
        `

    const { rows } = await client.query(sql, [clinic_id])

    return rows
  }

  public async get_clinics_professionals_new({
    options: { clinic_id, search, limit, offset },
    client = db
  }: method_payload<get_clinics_professionals_payload>) {
    let sql = `
            SELECT u.id,
            u."firstName",
            u."lastName",
            u.photo,
            CASE WHEN (ml.id IS NOT NULL) THEN row_to_json(ml) ELSE NULL end as medical_level,
            CASE WHEN (med_s.id IS NOT NULL) THEN row_to_json(med_s) ELSE NULL end as medical_specialization,
            ${this.table_name}.is_active as is_active,
            ${this.table_name}.is_admin as is_admin,
            ${this.table_name}.corporate_email as corporate_email,
            CASE
                WHEN telephones.id IS NOT NULL
                THEN json_build_object(
                    'code',
                    telephones."countryCode",
                    'number',
                    telephones.number,
                    'telephone',
                    telephones.telephone
                )
                ELSE NULL
            END as corporate_telephone,
            CASE
                WHEN ${this.table_name}.department_id IS NOT NULL
                THEN json_build_object(
                    'id',
                    cd.id,
                    'title',
                    cd.title
                )
                ELSE NULL
            END as department,
            avg_score.value as avg_score,
            row_to_json(sr) as sub_role
            FROM ${this.table_name}
            INNER JOIN sub_roles sr on clinic_positions.sub_role_id = sr.id
            INNER JOIN users u ON ${this.table_name
      }.user_id = u.id AND u."deletedAt" IS NULL
                ${search && search.length
        ? `AND concat("firstName", ' ', "lastName") ILIKE '%${search.trim()}%'`
        : ''
      }
            LEFT JOIN telephones ON ${this.table_name
      }.corporate_phone_id = telephones.id
            LEFT JOIN medical_levels ml on ${this.table_name
      }.medical_level_id = ml.id
            LEFT JOIN medical_specializations med_s on ${this.table_name
      }.medical_specialization_id = med_s.id
            LEFT JOIN clinic_department cd on ${this.table_name
      }.department_id = cd.id
            LEFT JOIN LATERAL (SELECT coalesce(avg(score), 0) as value from patient_feedback_records where doctor_id = ${this.table_name
      }.user_id and clinic_id = ${this.table_name
      }.clinic_id ) as avg_score on true
            WHERE ${this.table_name}.clinic_id = $1 
        `

    const { rowCount } = await client.query(sql, [clinic_id])
    sql += `${this.handle_limit(limit)}${this.handle_offset(offset)}`
    const { rows } = await client.query(sql, [clinic_id])
    return { rows: rows.length ? rows : [], total_count: rowCount }
  }

  public get_doctor_ids_by_specialization({
    options: { clinic_id, medical_specialization_id },
    client = db
  }: method_payload<get_doctor_ids_by_specialization_payload>) {
    const sql = `
            SELECT array_agg(distinct user_id) as ids 
            FROM ${this.table_name}
            ${this.handle_filters({ clinic_id, medical_specialization_id })}
        `

    return client.query(sql).then(({ rows }) => (rows[0] && rows[0].ids) || [])
  }

  public async change_department({
    options,
    client = db
  }: method_payload<change_department_payload>) {
    const sql = `
            UPDATE ${this.table_name}
            SET department_id = $1
            WHERE user_id = $2 and clinic_id = $3
            RETURNING *;
        `

    return client
      .query(sql, [options.department_id, options.user_id, options.clinic_id])
      .then(({ rows }) => rows[0])
  }

  public async doctors_by_clinic({
    options: { clinic_id },
    client = db
  }: method_payload<doctors_by_clinic_payload>) {
    const sql = `
      SELECT
      distinct user_attached_to_clinic."id"
      FROM ${this.table_name} as cli_sch 
      LEFT JOIN users as user_attached_to_clinic ON user_attached_to_clinic."id" =  cli_sch."user_id"
      WHERE 
      cli_sch."clinic_id" = '${clinic_id}'
      `
    let { rows } = await client.query(sql)
    return rows.length ? rows.map((data) => data.id) : []
  }

  public async get_all_responsible_persons(
    {
      options: { clinic_id, room_id },
      client = db
    }: method_payload<get_all_responsible_persons_payload>
  ) {
    const sql = `
    SELECT 
    user_id, is_responsible_person
    FROM 
    ${this.table_name}
    WHERE
    is_responsible_person = $1 AND
    room_id = $2
    `
    const { rows } = await client.query(sql, [true, room_id]);
    return rows.length ? rows : [];
  }
}

export const clinic_position_api = new Api({
  table_name: 'clinic_positions'
})
