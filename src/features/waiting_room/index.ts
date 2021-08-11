import { db } from '../../db'
import { base_api_image, method_payload } from '../base_api_image'
import {
  filter_struct,
  update_obj_struct,
  insert_record_payload,
  update_record_payload,
  delete_record_payload,
  get_record_payload,
  get_record_total_count_payload,
  get_patient_available_waiting_rooms,
  set_online_consultation_status_payload,
  get_online_consultation_status_payload,
  waiting_rooms_by_ids_payload,
  waiting_rooms_by_clinic_payload,
  ask_patient_payload,
  force_remove_patient_from_wr_payload,
  create_request_payload,
  requests_list_payload,
  change_access_payload
} from './types'

import { CONFIGURATIONS } from '../../config'

class Api extends base_api_image {
  private handle_filters({
    id,
    clinic_id,
    booking_only,
    per_invitation_only,
    medical_specializations_ids,
    search
  }: filter_struct) {
    const filter_literals = []

    if (typeof id === 'number')
      filter_literals.push(`${this.table_name}.id = ${id}`)
    if (Array.isArray(id) && id.length)
      filter_literals.push(`${this.table_name}.id IN (${id.join()})`)
    if (clinic_id)
      filter_literals.push(
        `(${this.table_name}.clinic_id = ${this.to_sql_string(clinic_id)} OR ${this.table_name}.clinic_id IS NULL)`
      )
    if (booking_only && Array.isArray(booking_only))
      filter_literals.push(
        `${this.table_name}.booking_only IN (${booking_only.join(',')})`
      )
    if (typeof per_invitation_only === 'boolean')
      filter_literals.push(
        `${this.table_name}.per_invitation_only = ${per_invitation_only}`
      )
    if (
      medical_specializations_ids &&
      Array.isArray(medical_specializations_ids)
    )
      filter_literals.push(
        `${this.table_name
        }.medical_specializations_id IN (${medical_specializations_ids.join(
          ','
        )})`
      )
    if (search)
      filter_literals.push(`${this.table_name}.title ILIKE '%${search}%'`)
    return filter_literals.length
      ? `WHERE ${filter_literals.join(' AND ')}`
      : ''
  }

  private handle_update_obj({
    title,
    avatar_id,
    open_from,
    open_to,
    booking_only,
    medical_specializations_id,
    per_invitation_only,
    telephone_id,
    email
  }: update_obj_struct) {
    const update_literals = []

    if (title) update_literals.push(`title = ${this.to_sql_string(title)}`)
    if (avatar_id !== undefined)
      update_literals.push(
        `avatar_id = ${avatar_id ? this.to_sql_string(avatar_id) : 'null'}`
      )
    if (open_from)
      update_literals.push(`open_from = ${this.to_sql_string(open_from)}`)
    if (open_to)
      update_literals.push(`open_to = ${this.to_sql_string(open_to)}`)
    if (typeof booking_only === 'boolean')
      update_literals.push(`booking_only = ${booking_only}`)
    if (medical_specializations_id)
      update_literals.push(
        `medical_specializations_id = ${medical_specializations_id}`
      )
    if (typeof per_invitation_only === 'boolean')
      update_literals.push(`per_invitation_only = ${per_invitation_only}`)
    if (telephone_id !== undefined)
      update_literals.push(
        `telephone_id = ${telephone_id ? this.to_sql_string(telephone_id) : 'null'
        }`
      )
    if (email !== undefined)
      update_literals.push(
        `email = ${email ? this.to_sql_string(email) : 'null'}`
      )

    return update_literals.length ? `SET ${update_literals.join()}` : ''
  }

  public insert_record({
    options: {
      title,
      avatar_id,
      clinic_id,
      created_by,
      open_from,
      open_to,
      booking_only = false,
      per_invitation_only = false,
      medical_specializations_id,
      telephone_id,
      email
    },
    client = db
  }: method_payload<insert_record_payload>) {
    const sql = `
            INSERT INTO ${this.table_name} (title, avatar_id, clinic_id, created_by, open_from, open_to, booking_only, per_invitation_only, medical_specializations_id, telephone_id, email)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *
        `

    return client
      .query(sql, [
        title,
        avatar_id || null,
        clinic_id || null,
        created_by,
        open_from || null,
        open_to || null,
        booking_only,
        per_invitation_only,
        medical_specializations_id,
        telephone_id || null,
        email || null
      ])
      .then(({ rows }) => rows[0])
  }

  public get_records_total_count({
    options: { filters },
    client = db
  }: method_payload<get_record_total_count_payload>) {
    const sql = `
            SELECT count(${this.table_name}.*)
            FROM ${this.table_name}
            ${this.handle_filters(filters)}
        `

    return client.query(sql).then(({ rows }) => (rows[0] && rows[0].count) || 0)
  }

  public get_record_list({
    options: { filters, limit, offset, order_by, sort_order },
    client = db
  }: method_payload<get_record_payload>) {
    let order_clause = `ORDER BY ${this.table_name}.id DESC`;
    if (order_by) order_clause = ` ORDER BY ${this.table_name}.${order_by} ${sort_order == 1 ? 'ASC' : 'DESC'}`
    const sql = `
            SELECT ${this.table_name}.id,
                   ${this.table_name}.title,
                   ${this.table_name}.clinic_id,
                   ${this.table_name}.email,
                   CASE
                     WHEN telephones.id IS NOT NULL
                       THEN json_build_object(
                         'code',
                         telephones."countryCode",
                         'number',
                         telephones.number,
                         'telephone',
                         telephones.telephone,
                         'isoCode', ct."isoCode"
                       )
                     ELSE NULL
                    END                            as telephone,
                   (SELECT start_time from auto_booking_schedules where waiting_room_id = waiting_room.id and day_of_week = extract(isodow from now()) LIMIT 1) as open_from,
                   (SELECT end_time from auto_booking_schedules where waiting_room_id = waiting_room.id and day_of_week = extract(isodow from now()) LIMIT 1) as open_to,
                   ${this.table_name}.booking_only,
                   ${this.table_name}.per_invitation_only,
                   row_to_json(medical_specializations) as medical_specialization,
                   CASE
                   WHEN wrs."waiting_room_id" IS NOT null AND wrs."waiting_room_id" = waiting_room."id" THEN
                   array_agg(
                    DISTINCT jsonb_build_object(
                        'id',wrs."id",
                        'day_of_week', wrs."day_of_week",
                        'time_from', timezone('UTC', wrs."start_time"::timestamptz)::time,
                        'time_to', timezone('UTC', wrs."end_time"::timestamptz)::time,
                        'clinic_consultation',
                        CASE
                            WHEN wrs."clinic_consultation" IS NOT null AND wrs."clinic_consultation" = true THEN
                            json_build_object(
                            'duration', wrs."clinic_consultation_duration", 
                            'price', wrs."clinic_consultation_price",
                            'payment_mode', wrs."clinic_consultation_payment_mode",
                            'clinic_approved', wrs."clinic_consultation_clinic_approved"
                            ) 
                            ELSE null
                        END,
                        'online_consultation',
                        CASE
                            WHEN wrs."online_consultation" IS NOT null AND wrs."online_consultation" = true THEN
                            json_build_object(
                            'duration', wrs."online_consultation_duration", 
                            'price', wrs."online_consultation_price",
                            'payment_mode', wrs."online_consultation_payment_mode",
                            'clinic_approved', wrs."online_consultation_clinic_approved"
                            )
                            ELSE null
                        END,
                        'home_visit', 
                        CASE
                            WHEN wrs."home_visit" IS NOT null AND wrs."home_visit" = true THEN
                            json_build_object(
                            'duration', wrs."home_visit_duration", 
                            'price', wrs."home_visit_price",
                            'payment_mode', wrs."home_visit_payment_mode",
                            'clinic_approved', wrs."home_visit_clinic_approved"
                            ) 
                            ELSE null
                        END
                    )
               ) 
                   ELSE null
                    END as schedules,
                    (SELECT count(*)
                    FROM doctor_waiting_room
                    where doctor_waiting_room.waiting_room_id = waiting_room.id) as doctors_count,
                    row_to_json(a) as avatar,
                    (SELECT count(*) from waiting_room_participant where waiting_room_participant.room_id = ${this.table_name
      }.id) as patients_count,
                    CASE
                    WHEN dwr."waiting_room_id" IS NOT null THEN
                    array_to_json(array_agg(DISTINCT jsonb_build_object( 
                     'id', dwr."user_id",
                     'avg_score', avg_score.value,
                     'firstName', udoc."firstName",
                     'lastName', udoc."lastName",
                     'photo', udoc."photo",
                     'corporate_email', cpos."corporate_email",
                     'medical_level',  
                     CASE
                       WHEN cpos."medical_level_id" IS NOT null THEN
                       json_build_object(
                       'id', udoc_mlevel."id", 
                       'title', udoc_mlevel."title"
                       ) 
                       ELSE null
                     END,
                     'medical_specialization', 
                     CASE
                       WHEN cpos."medical_specialization_id" IS NOT null THEN
                       json_build_object(
                       'id', udoc_mspec."id", 
                       'title', udoc_mspec."title"
                       ) 
                       ELSE null
                     END,
                     'corporate_telephone',  
                     CASE
                       WHEN cpos."corporate_phone_id" IS NOT null THEN
                       json_build_object(
                       'code', udoc_tel."countryCode", 
                       'number', udoc_tel."number",
                       'telephone', udoc_tel."telephone"
                       ) 
                       ELSE null
                     END,
                     'department', 
                     CASE
                         WHEN cpos."department_id" IS NOT null THEN
                         json_build_object(
                         'id', udoc_dep."id", 
                         'title', udoc_dep."title"
                         ) 
                         ELSE null
                     END
                    )))                    
                    ELSE '[]'
                    END AS participant_doctors,
                    CASE
                    WHEN wrp."room_id" IS NOT null THEN
                    array_to_json(array_agg(DISTINCT jsonb_build_object(
                      'id', wrp."user_id",
                      'firstName', upat."firstName",
                      'lastName', upat."lastName",
                      'photo', upat."photo"
                    )))                    
                    ELSE '[]'
                    END AS participant_patients
            FROM ${this.table_name}
                   LEFT JOIN (SELECT id, title, (${this.to_sql_string(
        CONFIGURATIONS.MEDICAL_SPECIALIZATION_ICON.BASEURL
      )} || icon_filename) as icon_url FROM medical_specializations) medical_specializations on waiting_room.medical_specializations_id = medical_specializations.id
                   LEFT JOIN telephones ON ${this.table_name
      }.telephone_id = telephones.id
                   LEFT JOIN attachments a on ${this.table_name
      }.avatar_id = a.id
                  LEFT JOIN auto_booking_schedules wrs on waiting_room.id = wrs.waiting_room_id
                  LEFT JOIN doctor_waiting_room dwr on dwr.waiting_room_id = ${this.table_name
      }.id
                  LEFT JOIN waiting_room_participant wrp on wrp.room_id = ${this.table_name
      }.id
                  LEFT JOIN users as udoc ON udoc.id = dwr.user_id
                  LEFT JOIN users as upat ON upat.id = wrp.user_id
                  LEFT JOIN clinic_positions as cpos ON cpos.user_id = dwr.user_id and cpos.clinic_id = ${this.table_name
      }.clinic_id

                  LEFT JOIN medical_levels as udoc_mlevel ON udoc_mlevel.id = cpos.medical_level_id
                  LEFT JOIN medical_specializations as udoc_mspec ON udoc_mspec.id = cpos.medical_specialization_id
                  LEFT JOIN telephones as udoc_tel on udoc_tel.id = cpos.corporate_phone_id
                  LEFT JOIN clinic_department as udoc_dep on udoc_dep.id = cpos.department_id   
                  LEFT JOIN LATERAL (SELECT coalesce(avg(score), 0) as value from patient_feedback_records where doctor_id = dwr.user_id and clinic_id = ${this.table_name
      }.clinic_id ) as avg_score on true
                  LEFT JOIN countries ct ON telephones."countryId" = ct."id"
            ${this.handle_filters(filters)}
            GROUP BY ${this.table_name
      }.id, medical_specializations.*, a.id, telephones.id, wrs.waiting_room_id, dwr.waiting_room_id, wrp.room_id, ct.id
            ${order_clause} 
            ${this.handle_limit(limit)}
            ${this.handle_offset(offset)}
        `

    return client.query(sql).then(({ rows }) => rows)

  }

  public update_record({
    options: { filters, update_obj },
    client = db
  }: method_payload<update_record_payload>) {
    const sql = `
            UPDATE ${this.table_name}
            ${this.handle_update_obj(update_obj)}
            ${this.handle_filters(filters)}
            RETURNING *
        `
    return client.query(sql).then(({ rows }) => rows)
  }

  public delete_record({
    options: { filters },
    client = db
  }: method_payload<delete_record_payload>) {
    const sql = `
            DELETE FROM ${this.table_name}
            ${this.handle_filters(filters)}
        `

    return client.query(sql)
  }

  public get_patient_available_waiting_rooms({
    options: { patient_id, clinic_id },
    client = db
  }: method_payload<get_patient_available_waiting_rooms>) {
    const sql = `
            SELECT waiting_room.id,
                   waiting_room.title,
                   (SELECT count(*)
                    FROM doctor_waiting_room
                    where doctor_waiting_room.waiting_room_id = waiting_room.id)::int as doctors_count,
                    CASE
                    WHEN wrs."waiting_room_id" IS NOT null AND wrs."waiting_room_id" = waiting_room."id" THEN
                    array_agg(
                     DISTINCT  
                     jsonb_build_object(
                         'id',wrs."id",
                         'day_of_week', wrs."day_of_week",
                         'time_from', to_char(wrs."start_time"::timestamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                         'time_to', to_char(wrs."end_time"::timestamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                      )
                    )
                    ELSE null
                     END as schedules,
                    row_to_json(ms) as medical_specialization,
                   row_to_json(a) as avatar
            FROM waiting_room
                   LEFT JOIN user_to_clinics on user_to_clinics.clinic_id = waiting_room.clinic_id and
                                                 user_to_clinics.user_id = $1
                   INNER JOIN auto_booking_schedules wrs on waiting_room.id = wrs.waiting_room_id
                        and wrs.day_of_week = (SELECT extract(isodow from now()))
                            and now()::time > timezone('UTC', wrs."start_time"::timestamptz)::time and now()::time < timezone('UTC', wrs."end_time"::timestamptz)::time
                   LEFT JOIN attachments a on waiting_room.avatar_id = a.id
                   LEFT JOIN medical_specializations ms on waiting_room.medical_specializations_id = ms.id
                   LEFT JOIN waiting_room_participant wrp
                        on waiting_room.id = wrp.room_id and wrp.user_id = $1
            ${this.handle_filters({
      booking_only: false,
      clinic_id
    })} AND user_to_clinics.clinic_id IS NOT NULL OR waiting_room.clinic_id IS NULL
            GROUP BY waiting_room.id, a.id, ms.id, wrp.room_id, wrp.user_id, wrs.waiting_room_id
        `

    return client.query(sql, [patient_id]).then(({ rows }) => rows)
  }

  public async online_consultation_set_status({
    options: { clinic_id, value },
    client = db
  }: method_payload<set_online_consultation_status_payload>) {
    let sql = `
            UPDATE clinics SET allow_online_consultation = $1 WHERE id = $2
            RETURNING *;
        `

    return await client
      .query(sql, [value, clinic_id])
      .then(({ rows }) => rows[0])
  }

  public async online_consultation_get_status({
    options: { clinic_id },
    client = db
  }: method_payload<get_online_consultation_status_payload>) {
    let sql = `
            SELECT allow_online_consultation FROM clinics WHERE id = $1;
        `

    return await client.query(sql, [clinic_id]).then(({ rows }) => rows[0])
  }

  public async waiting_rooms_by_ids({
    options: { waiting_room_ids_string },
    client = db
  }: method_payload<waiting_rooms_by_ids_payload>) {
    const sql = `
    SELECT 
    wr.*,
    CASE
        WHEN wr."clinic_id" IS NOT NULL
        THEN row_to_json(cli)
        ELSE NULL
    END as clinic,
    CASE
        WHEN wr."created_by" IS NOT NULL
        THEN row_to_json(cb)
        ELSE NULL
    END as created_by,
    CASE
        WHEN wr."avatar_id" IS NOT NULL
        THEN row_to_json(avatar)
        ELSE NULL
    END as avatar,
    CASE
        WHEN wr."medical_specializations_id" IS NOT NULL
        THEN row_to_json(medspec)
        ELSE NULL
    END as medical_specialization,
    CASE
        WHEN wr."telephone_id" IS NOT NULL
        THEN row_to_json(tele)
        ELSE NULL
    END as telephone,
    CASE
        WHEN cp."user_id" IS NOT NULL AND cp."clinic_id" IS NOT NULL AND dwr."waiting_room_id" IS NOT NULL 
        THEN
        array_to_json(array_agg(
        DISTINCT jsonb_build_object(
          'user_id', dwr."user_id",
          'waiting_room_id', dwr."waiting_room_id",
          'user', json_build_object(
            'id', doctor_user."id",
            'firstName', doctor_user."firstName",
            'lastName', doctor_user."lastName",
            'photo', doctor_user."photo",
            'role', doctor_role."name",
            'telephone', row_to_json(doctor_tele),
            'medical_specialization', json_build_object(
              'id', med_spec_doc."id",
              'title', med_spec_doc."title"
            ),
            'medical_level', json_build_object(
                'id', med_level_doc."id",
                'title', med_level_doc."title"
            )
          )
        )))    
        ELSE null
    END as participant_doctors       
    FROM
    ${this.table_name} as wr 
    LEFT JOIN clinics as cli ON cli."id" = wr."clinic_id"
    LEFT JOIN users as cb ON cb."id" = wr."created_by"
    LEFT JOIN attachments as avatar ON avatar."id" = wr."avatar_id"
    LEFT JOIN medical_specializations as medspec ON medspec."id" = wr."medical_specializations_id"
    LEFT JOIN telephones as tele ON tele."id" = wr."telephone_id"
    LEFT JOIN doctor_waiting_room AS dwr ON dwr."waiting_room_id" = wr."id"
    LEFT JOIN clinic_positions as cp ON cp."user_id" = dwr."user_id" and cp."clinic_id" = wr."clinic_id"
    LEFT JOIN users as doctor_user ON doctor_user."id" = dwr."user_id"
    LEFT JOIN medical_specializations as med_spec_doc ON med_spec_doc."id" =  cp."medical_specialization_id"
    LEFT JOIN medical_levels as med_level_doc ON med_level_doc."id" =  cp."medical_level_id"
    LEFT JOIN roles as doctor_role ON doctor_role."id" = doctor_user."roleId" 
    LEFT JOIN telephones as doctor_tele ON doctor_tele."id" = doctor_user."telephoneId" 
    WHERE wr."id" IN (${waiting_room_ids_string})
    GROUP BY wr."id", cli.*, cb.*, avatar.*, medspec.*, tele.*,  dwr."waiting_room_id", cp."user_id", cp."clinic_id";      
      `

    const { rows } = await client.query(sql)
    return rows.length ? rows : []
  }

  public async waiting_rooms_by_clinic({
    options: { clinic_id },
    client = db
  }: method_payload<waiting_rooms_by_clinic_payload>) {
    let sql = `
        SELECT 
        distinct wr.id
        FROM
        ${this.table_name} as wr 
        WHERE wr."clinic_id" = '${clinic_id}'; 
    `

    const { rows } = await client.query(sql)
    return rows.length ? rows.map((data) => data.id) : []
  }

  public async ask_patient({
    options: { waiting_room_id, user_to_ask },
    client = db
  }: method_payload<ask_patient_payload>) {
    const waiting_room_participant_table = 'waiting_room_participant',
      check_patient_in_wr = `
    SELECT 
    ${waiting_room_participant_table}.* 
    FROM ${waiting_room_participant_table}
    WHERE
    ${waiting_room_participant_table}."room_id" = ${waiting_room_id} AND
    ${waiting_room_participant_table}."user_id" = '${user_to_ask}'   
    `,
      update_participant_sql = `UPDATE 
    ${waiting_room_participant_table} 
    SET 
    requires_callback = true, requires_callback_at = now()
    WHERE 
    room_id = ${waiting_room_id} AND
    user_id = '${user_to_ask}'
    `,
      { rows } = await client.query(check_patient_in_wr)

    if (!rows.length) return 404
    else if (rows[0].requires_callback == true) return 400
    const { rowCount } = await client.query(update_participant_sql)
    return rowCount
  }

  public async force_remove_patient_from_wr({
    options: { waiting_room_id, user_to_remove },
    client = db
  }: method_payload<force_remove_patient_from_wr_payload>) {
    const waiting_room_participant_table = 'waiting_room_participant',
      check_patient_in_wr = `
        SELECT 
        ${waiting_room_participant_table}.*,
        wr.title as wr_name
        FROM ${waiting_room_participant_table}
        LEFT JOIN waiting_room wr ON wr.id =  ${waiting_room_participant_table}.room_id 
        WHERE
        ${waiting_room_participant_table}."room_id" = ${waiting_room_id} AND
        ${waiting_room_participant_table}."user_id" = '${user_to_remove}'   
      `,
      delete_waiting_room_participant = `
        DELETE FROM ${waiting_room_participant_table}
        WHERE 
        room_id = ${waiting_room_id} AND
        user_id = '${user_to_remove}'
      `,
      { rows } = await client.query(check_patient_in_wr)
    if (!rows.length) return 404
    const { rowCount } = await client.query(delete_waiting_room_participant)
    return { rowCount: rowCount, waiting_room_name: rows[0].wr_name }
  }

  public async create_request({
    options: { staff_id, room_id, user_id, clinic_id },
    client = db
  }: method_payload<create_request_payload>) {
    const tableName = "waiting_room_requests" 
    let check_request_sql = `SELECT * FROM ${tableName} WHERE "room_id" = '${room_id}' AND "staff_id" = '${staff_id}' AND "clinic_id" = '${clinic_id}' AND status = 'invited' LIMIT 1 OFFSET 0`;
    
    const request_found_data = await client.query(check_request_sql);
    if (request_found_data && request_found_data.rows.length == 0) {
      const sql =
        `INSERT INTO ${tableName} 
      (created_by_id, room_id, staff_id, clinic_id) 
      VALUES($1, $2, $3, $4) 
      RETURNING *`;
      return client.query(sql, [user_id, room_id, staff_id, clinic_id]).then(({ rows }: any) => {
        return rows;
      });
    } 
  }

  public async requests_list({
    options: { room_id, clinic_id },
    client = db
  }: method_payload<requests_list_payload>
  ) {
    const tableName = "waiting_room_requests"
    const sql = `SELECT 
    wrr.clinic_id,
    wrr.created_by_id,
    CASE 
    WHEN wrr.created_by_id IS NOT NULL
    THEN json_build_object(
      'id', created_by.id,
      'firstName', created_by."firstName",
      'lastName', created_by."lastName", 
      'photo', created_by.photo  
    )
    ELSE null
    END as created_by,
    CASE 
    WHEN wrr.staff_id IS NOT NULL
    THEN json_build_object(
      'id', staff.id,
      'firstName', staff."firstName",
      'lastName', staff."lastName", 
      'photo', staff.photo,
      'telephone', row_to_json(staff_tele),
      'role', staff_role.name,
      'medical_specializations', row_to_json(staff_med_spec)  
    )
    ELSE NULL
    END as staff,   
    CASE 
    WHEN wrr.room_id IS NOT NULL
    THEN json_build_object(
      'id', wr.id,
      'title', wr.title ,
      'clinic', json_build_object(
        'id', cli.id,
        'name', cli.name
      )
    )
    ELSE NULL
    END as waiting_room
    FROM 
    ${tableName} as wrr    
    LEFT JOIN clinic_positions as cp ON (cp.clinic_id = wrr.clinic_id) AND (cp.user_id = wrr.staff_id)
    LEFT JOIN clinics as cli ON cli.id = wrr.clinic_id
    LEFT JOIN waiting_room as wr ON (wr.id = wrr.room_id) AND (wr.clinic_id = cp.clinic_id)
    LEFT JOIN medical_specializations as staff_med_spec ON staff_med_spec.id = cp.medical_specialization_id  
    LEFT JOIN users as staff ON staff.id = cp.user_id
    LEFT JOIN roles as staff_role ON staff."roleId" = staff_role.id
    LEFT JOIN telephones as staff_tele ON staff."telephoneId" = staff_tele.id
    LEFT JOIN users as created_by ON created_by.id = wrr.created_by_id
    WHERE
    wrr.clinic_id = $1 AND
    wrr.room_id = $2 AND
    wrr.status = 'invited'   
    `
    return await client.query(sql, [clinic_id, room_id]);
  }

  public async check_request_availability({
    options: { room_id, clinic_id, staff_id },
    client = db
  }: method_payload<requests_list_payload>
  ) {
    const tableName = "waiting_room_requests", sql = `SELECT wrr.*
    FROM 
    ${tableName} as wrr    
    WHERE
    wrr."clinic_id" = $1 AND
    wrr."room_id" = $2 AND   
    wrr."staff_id" = $3
    `
    const data = await client.query(sql, [clinic_id, room_id, staff_id]);
    return data && data.rows.length ? data.rows : []
  }

  public async change_access({
    options: { staff_id, room_id, clinic_id, access_type },
    client = db
  }: method_payload<change_access_payload>) {
    const tableName = "waiting_room_requests"
    const sql = `UPDATE ${tableName} SET status = $1 WHERE room_id = $2 AND clinic_id = $3 AND staff_id = $4 RETURNING *`;
    return client.query(sql, [access_type, room_id, clinic_id, staff_id]).then(({ rows }: any) => {
      return rows;
    });
  }
}

export const waiting_room_api = new Api({
  table_name: 'waiting_room'
})
