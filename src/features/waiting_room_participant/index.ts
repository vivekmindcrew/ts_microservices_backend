import { db } from '../../db'
import { base_api_image, method_payload } from '../base_api_image'
import {
  filters_struct,
  update_obj_struct,
  delete_record_payload,
  update_record_payload,
  upsert_record_payload,
  get_records_payload,
  get_mapped_records_list_payload,
  get_user_waiting_rooms_payload,
  get_wr_particpant_associated_event_payload,
  update_captured_status_for_pick_by_doctor_payload,
  is_access_of_responsible_person_payload
} from './types'

class Api extends base_api_image {
  private handle_filters({ user_id, room_id, picked_by }: filters_struct) {
    const filter_literals = []

    if (room_id) filter_literals.push(`${this.table_name}.room_id = ${room_id}`)
    if (user_id)
      filter_literals.push(
        `${this.table_name}.user_id = ${this.to_sql_string(user_id)}`
      )
    if (picked_by)
      filter_literals.push(
        `${this.table_name}.picked_by = ${this.to_sql_string(picked_by)}`
      )
    if (picked_by === null)
      filter_literals.push(`${this.table_name}.picked_by is null`)

    return filter_literals.length
      ? `WHERE ${filter_literals.join(' AND ')}`
      : ''
  }

  private handle_update_obj({
    picked_by,
    symptoms,
    room_id
  }: update_obj_struct) {
    const update_literals = []

    if (picked_by)
      update_literals.push(`picked_by = ${this.to_sql_string(picked_by)}`)
    if (picked_by === null) update_literals.push(`picked_by = ${picked_by}`)
    if (symptoms)
      update_literals.push(`symptoms = ${this.to_sql_string(symptoms)}`)
    if (room_id) update_literals.push(`room_id = ${room_id}`)
    return update_literals.length ? `SET ${update_literals.join()}` : ''
  }

  public upsert_record({
    options: {
      user_id,
      room_id,
      symptoms,
      description,
      body_part_ids,
      next_45_minutes_ts,
      post_45_mins_ts
    },
    client = db
  }: method_payload<upsert_record_payload>) {
    const sql = `
            INSERT INTO ${this.table_name} (user_id, room_id, symptoms, description, body_parts, forty_five_mins_timestamp, post_five_mins_timestamp)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT(user_id, room_id)
            DO UPDATE
            SET symptoms = EXCLUDED.symptoms, description = EXCLUDED.description, body_parts = EXCLUDED.body_parts
            RETURNING *
        `
    return client
      .query(sql, [
        user_id,
        room_id,
        symptoms || null,
        description,
        body_part_ids,
        next_45_minutes_ts,
        post_45_mins_ts
      ])
      .then(({ rows }) => rows[0])
  }

  public get_record_list({
    options: { filters, limit, offset },
    client = db
  }: method_payload<get_records_payload>) {
    const sql = `
            SELECT * FROM ${this.table_name}
            ${this.handle_filters(filters)}
            ORDER BY ${this.table_name}.created_at ASC
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

  public get_mapped_records({
    options: { filters, limit, offset },
    client = db
  }: method_payload<get_mapped_records_list_payload>) {
    const sql = `
            SELECT ${this.table_name}.room_id,
                   ${this.table_name}.created_at,
                   ${this.table_name}.symptoms,
                   ${this.table_name}.description,
                   CASE WHEN (picked_u.id IS NOT NULL) THEN json_build_object(
                       'id',
                       picked_u.id,
                       'firstName',
                       picked_u."firstName",
                       'lastName',
                       picked_u."lastName",
                       'photo',
                       picked_u.photo
                   ) ELSE NULL END as picked_by_info,
                   json_build_object(
                      'id',
                      u.id,
                      'firstName',
                      u."firstName",
                      'lastName',
                      u."lastName",
                      'photo',
                      u.photo,
                      'gender_user',
                      u.gender,
                      'telephone',
                      json_build_object(
                          'telephone',
                          telephones.telephone,
                          'countryCode',
                          telephones."countryCode",
                          'number',
                          telephones.number
                      )
                   ) as user_info,
                   (SELECT 
                    array_to_json(array_agg(
                      jsonb_build_object(
                        'id', wr_part_events."event_id",
                        'user_id', wr_part_events."user_id",
                        'status', wr_part_events."status"
                      )                   
                    )) 
                    FROM
                    event_participant as wr_part_events
                    LEFT JOIN event as ev 
                    ON ev."id" = wr_part_events."event_id"
                    WHERE
                    ev."waiting_room_id" =  ${this.table_name}."room_id" AND
                    ${this.table_name}."user_id" = wr_part_events."user_id" AND
                    wr_part_events."status" = 'approved'
                   ) as events,
                   (SELECT array_to_json(array_agg(row_to_json(bp)))
                    from body_parts bp
                    where bp.id = ANY (${
                      this.table_name
                    }.body_parts)) as body_parts
            FROM ${this.table_name}
                   INNER JOIN users u on ${this.table_name}.user_id = u.id
                   LEFT JOIN users picked_u on ${
                     this.table_name
                   }.picked_by = picked_u.id
                   INNER JOIN telephones ON u."telephoneId" = telephones.id
           ${this.handle_filters(filters)}
           ORDER BY ${this.table_name}.created_at ASC
           ${this.handle_limit(limit)}
           ${this.handle_offset(offset)}
        `

    return client.query(sql).then(({ rows }) => rows)
  }

  public get_user_waiting_room({
    options: { user_id },
    client = db
  }: method_payload<get_user_waiting_rooms_payload>) {
    const sql = `
            SELECT waiting_room.id,
                   waiting_room.title,
                   row_to_json(a)  as avatar,
                   row_to_json(ms) as medical_specialization,
                   CASE WHEN c.id IS NOT NULL THEN json_build_object(
                       'id',
                       c.id,
                       'name',
                       c.name,
                       'logo',
                       CASE
                        WHEN (c.logo_id IS NOT NULL) THEN json_build_object(
                            'id',
                            ca.id,
                            'url',
                            ca.source_url
                        )
                        ELSE NULL END
                     ) ELSE NULL 
                     END            as clinic,
                   number::int          as queue_number,
                   round((number * 5 / CASE
                      WHEN (
                          (SELECT count(*) from doctor_waiting_room where doctor_waiting_room.waiting_room_id = waiting_room_participant.room_id) =
                          0) then 1
                      else (SELECT count(*) from doctor_waiting_room where doctor_waiting_room.waiting_room_id = waiting_room_participant.room_id)
                   END - EXTRACT(EPOCH FROM (now() - created_at)) / 60)::numeric, 2) as estimated_time
            from waiting_room_participant
                   INNER JOIN waiting_room on waiting_room_participant.room_id = waiting_room.id
                   LEFT JOIN clinics c on waiting_room.clinic_id = c.id
                   LEFT JOIN attachments ca ON c.logo_id = ca.id
                   LEFT JOIN medical_specializations ms on waiting_room.medical_specializations_id = ms.id
                   LEFT JOIN attachments a on waiting_room.avatar_id = a.id
                   INNER JOIN LATERAL (SELECT number
                                       from (SELECT user_id,
                                                    ROW_NUMBER() OVER ( ORDER BY waiting_room_participant.created_at ASC ) as number
                                             FROM waiting_room_participant
                                             where waiting_room_participant.room_id = waiting_room.id
                                               and picked_by is null) as sub
                                       where sub.user_id = $1
              ) as queue_num on true
            WHERE waiting_room_participant.user_id = $1
        `

    return client.query(sql, [user_id]).then(({ rows }) => rows)
  }

  public get_wr_particpant_associated_event({
    options: { event_id, room_id, participant_id },
    client = db
  }: method_payload<get_wr_particpant_associated_event_payload>) {
    const event_table = 'event',
      event_participant_table = 'event_participant',
      sql = `
            SELECT 
            ${this.table_name}."user_id" as participant_id,
            ${event_participant_table}."status" as event_status,
            ${event_table}."payment_intent_id",
            ${event_table}."is_captured",
            ${event_table}."clinic_id"
            FROM 
            ${this.table_name} 
            LEFT JOIN ${event_participant_table} on ${event_participant_table}.user_id = ${this.table_name}.user_id
            LEFT JOIN ${event_table} on ${event_table}.id = ${event_participant_table}.event_id 
            WHERE 
            ${this.table_name}."room_id" = '${room_id}' AND
            ${this.table_name}."user_id" = '${participant_id}' AND
            ${event_participant_table}.event_id = '${event_id}' AND
            ${event_table}."waiting_room_id" = '${room_id}'
        `

    return client.query(sql)
  }

  public async update_captured_status_for_pick_by_doctor({
    options: { event_id },
    client = db
  }: method_payload<update_captured_status_for_pick_by_doctor_payload>) {
    const event_table = 'event'
    const sql = `
    UPDATE 
    ${event_table}
    SET is_captured = true
    WHERE ${event_table}.id = ${event_id}    
    `
    const { rowCount } = await client.query(sql)
    return rowCount
  }

  public async is_access_of_responsible_person({
    options: { loggedInUser, clinic_id, room_id },
    client = db
  }: method_payload<is_access_of_responsible_person_payload>) {
    const sql = `
        SELECT is_responsible_person
        FROM doctor_waiting_room
        WHERE user_id = '${loggedInUser}' AND waiting_room_id='${room_id}'
      `
    return client.query(sql).then(({ rows }) => rows[0])
  }
}

export const waiting_room_participant_api = new Api({
  table_name: 'waiting_room_participant'
})
