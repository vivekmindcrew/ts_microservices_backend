import { base_api_image, method_payload } from '../base_api_image'
import {
  filters_struct,
  delete_records_payload,
  get_records_payload,
  upsert_doctor_waiting_room,
  get_waiting_room_doctors_payload,
  decide_doctors_to_remove_payload,
  doctor_waiting_rooms_payload,
  doctor_presence_in_wr_payload,
  check_resp_person_payload,
  create_responsible_person_payload,
  responsible_persons_payload
} from './types'
import { db } from '../../db'
import { EXCEPTION_MESSAGES } from '../../constants/index'

class Api extends base_api_image {
  private handle_filters({ user_id, waiting_room_id }: filters_struct) {
    const filter_literals = []

    if (user_id)
      filter_literals.push(
        `${this.table_name}.user_id = ${this.to_sql_string(user_id)}`
      )
    if (waiting_room_id)
      filter_literals.push(
        `${this.table_name}.waiting_room_id = ${waiting_room_id}`
      )

    return filter_literals.length
      ? `WHERE ${filter_literals.join(' AND ')}`
      : ''
  }

  public upsert_record({
    options: { user_id, waiting_room_id },
    client = db
  }: method_payload<upsert_doctor_waiting_room>) {
    const sql = `
            INSERT INTO ${this.table_name} (user_id, waiting_room_id)
            VALUES ($1, $2)
            RETURNING *
        `

    return client
      .query(sql, [user_id, waiting_room_id])
      .then(({ rows }) => rows[0])
  }

  public get_records({
    options: { filters },
    client = db
  }: method_payload<get_records_payload>) {
    const sql = `
            SELECT * 
            FROM ${this.table_name}
            ${this.handle_filters(filters)}
        `

    return client.query(sql).then(({ rows }) => rows)
  }

  public delete_records({
    options: { filters },
    client = db
  }: method_payload<delete_records_payload>) {
    const sql = `
            DELETE FROM ${this.table_name}
            ${this.handle_filters(filters)}
        `

    return client.query(sql)
  }

  public get_waiting_room_doctors({
    options: { filters },
    client = db
  }: method_payload<get_waiting_room_doctors_payload>) {
    const sql = `
            SELECT u.id, u."firstName", u."lastName", u.photo, doctor_waiting_room.waiting_room_id 
            FROM doctor_waiting_room
                   INNER JOIN users u on doctor_waiting_room.user_id = u.id
            ${this.handle_filters(filters)}
        `

    return client.query(sql).then(({ rows }) => rows)
  }

  public attach_staff_to_wr({
    options: { user_id, waiting_room_id },
    client = db
  }: method_payload<upsert_doctor_waiting_room>) {
    const sql = `
        INSERT INTO ${this.table_name} (user_id, waiting_room_id)
        VALUES ('${user_id}', ${waiting_room_id})
        RETURNING *
    `
    return client.query(sql).then(({ rows }) => rows[0])
  }

  public decide_to_remove_doctors({
    options: { waiting_room_id },
    client = db
  }: method_payload<decide_doctors_to_remove_payload>) {
    const sql = `
    SELECT 
    (select COUNT(dwr.waiting_room_id) from doctor_waiting_room as dwr where dwr.waiting_room_id =  ${waiting_room_id} group by dwr.waiting_room_id) AS doctors_available,    
    COUNT(ev.id) as bookings_available
    FROM event as ev 
    WHERE 
    ev.waiting_room_id = ${waiting_room_id} AND
    ev.start_at = now()::timestamptz
    group by ev.waiting_room_id 
    `
    return client.query(sql).then(({ rows }) => rows)
  }

  public async doctor_waiting_rooms({
    options: { user_id },
    client = db
  }: method_payload<doctor_waiting_rooms_payload>) {
    const sql = `
    SELECT
    ${this.table_name}."user_id",
    wr."id",
    wr."title",
    wr."clinic_id",
    cli."name",
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
        WHEN wrs.waiting_room_id IS NOT NULL
        THEN   array_to_json(array_agg(DISTINCT jsonb_build_object(
          'id', wrs."id",
          'waiting_room_id', wrs."waiting_room_id",
          'user_id', wrs."user_id",
          'day_of_week', wrs."day_of_week",
          'time_from', (wrs."start_time"::timestamptz)::time,
          'time_to', (wrs."end_time"::timestamptz)::time,
          'waiting_room', json_build_object(
            'id', wr."id",
            'clinic_id', wr."clinic_id",
            'clinic', row_to_json(cli),
            'title', wr."title",
            'avatar_id', wr."avatar_id",
            'avatar', row_to_json(attachtwr),
            'open_from',wr."open_from",
            'open_to', wr."open_to",
            'booking_only', wr."booking_only",
            'per_invitation_only', wr."per_invitation_only",
            'medical_specializations_id', wr."medical_specializations_id",
            'medical_specializations', row_to_json(mswr),
            'telephone_id', wr."telephone_id",
            'telephone', row_to_json(twr),
            'email', wr."email"
          ),
          'clinic_consultation', case WHEN wrs."clinic_consultation" IS NOT null AND wrs."clinic_consultation" = true THEN
              json_build_object(
              'duration', wrs."clinic_consultation_duration", 
              'price', wrs."clinic_consultation_price",
              'payment_mode', wrs."clinic_consultation_payment_mode",
              'clinic_approved', wrs."clinic_consultation_clinic_approved"
              ) 
              ELSE null
            END,
          'online_consultation', CASE
              WHEN wrs."online_consultation" IS NOT null AND wrs."online_consultation" = true THEN
              json_build_object(
              'duration', wrs."online_consultation_duration", 
              'price', wrs."online_consultation_price",
              'payment_mode', wrs."online_consultation_payment_mode",
              'clinic_approved', wrs."online_consultation_clinic_approved"
              )
              ELSE null
          END, 
          'home_visit', CASE
              WHEN wrs."home_visit" IS NOT null AND wrs."home_visit" = true THEN
              json_build_object(
              'duration', wrs."home_visit_duration", 
              'price', wrs."home_visit_price",
              'payment_mode', wrs."home_visit_payment_mode",
              'clinic_approved', wrs."home_visit_clinic_approved"
              ) 
              ELSE null
          END
      )))
        ELSE null
    END as schedules   
    FROM
    ${this.table_name} 
    LEFT JOIN waiting_room as wr ON wr."id" = ${this.table_name}."waiting_room_id"
    LEFT JOIN clinics as cli ON cli."id" = wr."clinic_id"
    LEFT JOIN clinic_positions as cp ON cp."user_id" = ${this.table_name}."user_id" and cp."clinic_id" = wr."clinic_id"
    LEFT JOIN attachments as avatar ON avatar."id" = wr."avatar_id"
    LEFT JOIN medical_specializations as medspec ON medspec."id" = wr."medical_specializations_id"
    LEFT JOIN auto_booking_schedules as wrs ON wrs."waiting_room_id" = ${this.table_name}."waiting_room_id"
    LEFT JOIN telephones as twr ON twr."id" = wr."telephone_id"
    LEFT JOIN attachments as attachtwr ON attachtwr."id" = wr."avatar_id"
    LEFT JOIN medical_specializations as mswr ON mswr."id" = wr."medical_specializations_id"
    WHERE ${this.table_name}."user_id" = '${user_id}'
    GROUP BY wr."id", cli."id", avatar."id", medspec."id", ${this.table_name}."waiting_room_id",${this.table_name}."user_id", cp."user_id", cp."clinic_id", wrs."waiting_room_id";`
    let { rows } = await client.query(sql)
    return rows.length ? rows.map((data) => data) : []
  }

  public async check_doctor_presence_in_wr({
    options: { room_id },
    client = db
  }: method_payload<doctor_presence_in_wr_payload>) {
    const sql = `
    SELECT 
    * 
    FROM
    ${this.table_name}
    WHERE
    room_id = '${room_id}'
    `
    const { rows } = await client.query(sql);
    return rows.length ? rows : [];
  }

  public async check_responsible_person(
    {
      options: { room_id, user_id },
      client = db
    }: method_payload<check_resp_person_payload>
  ) {
    const sql = `
        SELECT is_responsible_person
        FROM doctor_waiting_room
        WHERE user_id = '${user_id}' and waiting_room_id='${room_id}'
        `
    return client.query(sql).then(({rows}) => rows)
  }

  public async update_responsible_persons(
    {
      options: { clinic_id, person_id, toggle, room_id },
      client = db
    }: method_payload<create_responsible_person_payload>
  ) {
    const clinic_position_table = "clinic_positions";
    const check_doctor_position_in_cli_sql = `SELECT * FROM ${clinic_position_table} WHERE clinic_id = '${clinic_id}' AND user_id = '${person_id}' LIMIT 1 OFFSET 0`
    let { rows } = await client.query(check_doctor_position_in_cli_sql)
    if (rows && !rows.length) {
      const error = new Error(EXCEPTION_MESSAGES.ON_USER_NOT_BELONGED_TO_CLINIC)
      error.statusCode = 400
      throw error
    }
    else {
      const check_doctor_availability_in_wr_sql = `SELECT * FROM doctor_waiting_room WHERE user_id = '${person_id}' AND waiting_room_id = ${room_id} LIMIT 1 OFFSET 0`
      let { rows } = await client.query(check_doctor_availability_in_wr_sql)
      if (rows && !rows.length) {
        const error = new Error(EXCEPTION_MESSAGES.ON_USER_NOT_BELONGED_TO_WR)
        error.statusCode = 400
        throw error
      }
      else {
        const update_is_resp_sql = `
          UPDATE ${this.table_name} SET is_responsible_person = '${toggle}'
          WHERE user_id = '${person_id}' and waiting_room_id = '${room_id}'
          RETURNING *`
        const { rowCount } = await client.query(update_is_resp_sql)
        return rowCount
      }
    }
  }

  public async responsible_persons(
    {
      options: { user_id, clinic_id, room_id },
      client = db
    }: method_payload<responsible_persons_payload>
  ) {
    const sql = `
    SELECT 
    dwr.user_id,
    dwr.waiting_room_id,
    CASE 
    WHEN dwr.user_id IS NOT NULL THEN
    json_build_object(
      'id', dwr.user_id,
      'firstName', u."firstName",
      'lastName', u."lastName",
      'photo', u.photo,
      'medical_specialization', CASE 
      WHEN cp.medical_specialization_id IS NOT NULL 
      THEN json_build_object(
        'id', med_spec.id,
        'title', med_spec.title
      )
      ELSE NULL
      END
    )
    ELSE NULL
    END AS user
    FROM ${this.table_name} AS dwr
    LEFT JOIN clinic_positions as cp ON cp.user_id = dwr.user_id AND cp.clinic_id = '${clinic_id}'
    LEFT JOIN users as u ON u.id =  cp.user_id
    LEFT JOIN medical_specializations as med_spec ON med_spec.id = cp.medical_specialization_id
    WHERE 
    dwr.waiting_room_id = '${room_id}' AND 
    dwr.is_responsible_person = true
    `

    return await client.query(sql).then(({ rows }: any) => {
      return rows
    });
  }
}

export const doctor_waiting_room_api = new Api({
  table_name: 'doctor_waiting_room'
})
