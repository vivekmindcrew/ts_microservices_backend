import { Pool } from 'pg'
import { db } from '../../db'
import {
  EXCEPTION_MESSAGES,
  REGULAR_EXPRESSIONS,
  SUBSCRIPTIONS_TYPES
} from '../../constants'
import { base_api_image, method_payload } from '../base_api_image'
import {
  get_clinics_in_area_payload,
  get_list_payload,
  filters_struct,
  get_clinic_type_payload,
  add_fhir_endpoint_payload,
  edit_fhir_endpoint_payload,
  delete_fhir_endpoint_payload,
  get_fhir_endpoint_payload,
  set_clinic_logo_payload,
  add_clinic_payload,
  update_clinic_payload,
  set_clinic_buttons_payload,
  check_domain_payload,
  set_domain_payload,
  add_attachment_payload,
  delete_attachment_payload,
  set_decide_payload,
  set_clinic_approve_payload,
  get_attachments_filter_type,
  get_attachments_payload,
  change_status_options_payload,
  current_general_settings_options_payload,
  change_clinic_general_settings_payload,
  get_schedules_for_day_payload,
  check_if_slot_is_available_payload,
  get_doctors_count_in_wr_payload,
  get_clinic_current_ehr_status_payload,
  change_clinic_ehr_status_payload,
  create_approved_position_for_wr_payload,
  approve_doctor_for_waiting_room_payload,
  current_auto_booking_status_payload,
  waiting_staff_for_waiting_room_payload,
  remove_waiting_staff_for_waiting_room_payload
} from './types'
import { internal_commutator } from '../../internal_commutator'

class Api extends base_api_image {
  private table_addresses: string = 'addresses'
  private table_phones: string = 'telephones'
  private table_countries: string = 'countries'
  private table_types: string = '"clinic-types"'

  private handle_filters({
    area,
    types,
    search,
    id,
    country_id
  }: filters_struct) {
    const filterLiterals: string[] = []
    if (id) {
      if (REGULAR_EXPRESSIONS.UUID.test(id))
        filterLiterals.push(`${this.table_name}.id = ${this.to_sql_string(id)}`)
      else
        filterLiterals.push(
          `${this.table_name}.clinic_domain = ${this.to_sql_string(id)}`
        )
    }
    if (area) {
      filterLiterals.push(
        `box '((${area.top_left.longitude},${area.top_left.latitude}),(${area.bottom_right.longitude},${area.bottom_right.latitude}))' @> point (${this.table_addresses}.longitude,${this.table_addresses}.latitude)`
      )
    }
    if (search && search.length)
      filterLiterals.push(
        `(${this.table_name}.name ILIKE '%${search}%' OR ${this.table_name}.org_code ILIKE '%${search}%')`
      )
    if (types && types.length)
      filterLiterals.push(
        `${this.table_name}."clinicTypeId" IN (${types.join(',')})`
      )
    if (country_id)
      filterLiterals.push(`${this.table_name}."countryId" = (${country_id})`)
    return filterLiterals.length ? `WHERE ${filterLiterals.join(' AND ')}` : ''
  }

  public async get_area_list({
    options: { top_left, bottom_right, clinic_type_id, country_id },
    client = db
  }: method_payload<get_clinics_in_area_payload>) {
    const sql = `
            SELECT 
                ${this.table_name}.id,
                ${this.table_name}.name,
                ${this.table_addresses}.latitude,
                ${this.table_addresses}.longitude
            FROM ${this.table_name}
                INNER JOIN ${this.table_addresses} ON ${
      this.table_name
    }."addressId" = ${this.table_addresses}.id
            ${this.handle_filters({
              area: { top_left, bottom_right },
              types: clinic_type_id ? [clinic_type_id] : undefined,
              country_id
            })}
        `

    return client.query(sql).then((res) => res.rows)
  }

  public get_list({
    options: { specializations, filters, limit, offset },
    client = db
  }: method_payload<get_list_payload>) {
    const sql = `
            SELECT ${this.table_name}.id,
                   ${this.table_name}.org_code,
                   ${this.table_name}.name,
                   ${this.table_name}.clinic_domain as domain_name,
                   ${this.table_name}.description,
                   ${this.table_name}.clinic_tz,
                   ${this.table_name}.allow_online_consultation,
                   ${this.table_name}.auto_booking_status,
                   (SELECT coalesce(avg(score), 0) from patient_feedback_records where clinic_id = ${
                     this.table_name
                   }.id ) as avg_score,
                   CASE
                     WHEN (${
                       this.table_name
                     }.logo_id IS NOT NULL) THEN json_build_object(
                        'id',
                        at.id,
                        'url',
                        at.source_url
                       )
                     ELSE NULL END                    as logo,
                    json_build_object(
                        'id',
                        ct.id,
                        'name',
                        ct.name
                   )                                 as clinic_type,
                   CASE
                     WHEN (t.id IS NOT NULL) THEN json_build_object(
                         'id',
                         t.id,
                         'telephone',
                         t.telephone,
                         'code',
                         t."countryCode",
                         'number',
                         t.number
                       )
                     ELSE NULL END                                 as telephone,
                   ce.email                                           as email,
                   json_build_object(
                       'postal',
                       a.postal,
                       'state',
                       a.state,
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
                           'id',
                           ac.id,
                           'iso3code',
                           ac."iso3Code",
                           'name',
                           ac.name
                         )
                     )                                             as address,
                    (SELECT ARRAY( 
                        SELECT 
                            json_build_object('id', cbl.id, 'title', cbl.title, 'action', ctb.action) 
                        FROM clinic_to_button ctb 
                        LEFT JOIN clinic_button_list cbl ON (cbl.id = ctb.button_id) 
                        WHERE ctb.clinic_id = ${this.table_name}.id)
                    ) as buttons,
                    (SELECT count(*)
                    FROM clinic_positions
                           INNER JOIN users u on clinic_positions.user_id = u.id AND u."deletedAt" IS NULL
                    WHERE clinic_positions.clinic_id = ${
                      this.table_name
                    }.id) as members_total_count
            from ${this.table_name}
                   INNER JOIN countries c on ${
                     this.table_name
                   }."countryId" = c.id
                   LEFT JOIN telephones t on t.id = ${
                     this.table_name
                   }."telephoneId"
                   INNER JOIN "clinic-types" ct on ${
                     this.table_name
                   }."clinicTypeId" = ct.id
                   LEFT JOIN "clinic-emails" ce on ${
                     this.table_name
                   }.id = ce."clinicId" AND ce."deletedAt" IS NULL
                   INNER JOIN addresses a on ${
                     this.table_name
                   }."addressId" = a.id
                   INNER JOIN countries ac on ac.id = a."countryId"
                   LEFT JOIN attachments at ON (at.id = ${
                     this.table_name
                   }.logo_id)
                   ${
                     specializations && specializations.length
                       ? `INNER JOIN clinic_positions cp on clinics.id = cp.clinic_id AND cp.medical_specialization_id IN (${specializations.join(
                           ','
                         )})`
                       : ''
                   }
            ${this.handle_filters(filters)}
            GROUP BY ${
              this.table_name
            }.id, c.id, ct.id, t.id, ce.id, a.id, ac.id, at.id
            ORDER BY  ${this.table_name}.name
            ${this.handle_offset(offset)}
            ${this.handle_limit(limit)}
        `

    return client.query(sql).then(({ rows }) => rows)
  }

  public async get_clinic_types({
    options: { country_id },
    client = db
  }: method_payload<get_clinic_type_payload>) {
    const sql = `
            select distinct ct.id, ct.name as title from "clinic-types" ct
                left join ${this.table_name} c on (c."clinicTypeId" = ct.id )
                where (c."countryId" = $1 or ct.id < 100000) and ct."deletedAt" is null
                order by ct.id;
            `

    return client.query(sql, [country_id]).then((res) => res.rows)
  }

  public async add_fhir_endpoint({
    options: {
      clinic_id,
      fhir_endpoint,
      username,
      password,
      type,
      access,
      org_id
    },
    client = db
  }: method_payload<add_fhir_endpoint_payload>) {
    const data = `emp$${username}:${password}`
    const buff = Buffer.from(data)
    const base64data = buff.toString('base64')
    const sql = `
            INSERT INTO fhir_servers (clinic_id, base_url, username, "authorization", "type", "access", org_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `

    return await client
      .query(sql, [
        clinic_id,
        fhir_endpoint,
        username,
        base64data,
        type,
        access,
        org_id
      ])
      .then(({ rows }) => rows[0])
  }

  public async edit_fhir_endpoint({
    options: {
      id,
      fhir_endpoint,
      username,
      password,
      type,
      access,
      clinic_id,
      org_id
    },
    client = db
  }: method_payload<edit_fhir_endpoint_payload>) {
    let base64data = ''
    if (password && username) {
      const data = `emp$${username}:${password}`
      const buff = Buffer.from(data)
      base64data = buff.toString('base64')
    }

    let update_field: string[] = []
    if (fhir_endpoint)
      update_field.push(`base_url = ${this.to_sql_string(fhir_endpoint)}`)
    if (type)
      update_field.push(`"type" = ${this.to_sql_string(type.toString())}`)
    if (access) update_field.push(`"access" = ${this.to_sql_string(access)}`)
    if (org_id) update_field.push(`org_id = ${this.to_sql_string(org_id)}`)
    if (password && username) {
      update_field.push(`username = ${this.to_sql_string(username)}`)
      update_field.push(`"authorization" = ${this.to_sql_string(base64data)}`)
    }

    if (update_field.length === 0) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_FAILED_NOTHING_TO_UPDATE)
      ex.statusCode = 400
      throw ex
    }

    const sql = `
            UPDATE fhir_servers SET ${update_field.join(', ')}
            WHERE id = $1 and clinic_id = $2
            RETURNING *;
        `

    return await client.query(sql, [id, clinic_id]).then(({ rows }) => rows[0])
  }

  public async delete_fhir_endpoint({
    options: { id, clinic_id },
    client = db
  }: method_payload<delete_fhir_endpoint_payload>) {
    const sql = `
            DELETE FROM fhir_servers WHERE id = $1 and clinic_id = $2
            RETURNING *;
        `

    return await client.query(sql, [id, clinic_id]).then(({ rows }) => rows[0])
  }

  public async get_fhir_endpoints({
    options: { clinic_id },
    client = db
  }: method_payload<get_fhir_endpoint_payload>) {
    const sql = `
            SELECT 
                id,
                base_url,
                username,
                type,
                access,
                status as last_sync_success,
                last_sync_start,
                org_id
            FROM fhir_servers
            WHERE clinic_id = $1;
        `

    return await client.query(sql, [clinic_id]).then(({ rows }) => rows)
  }

  public async set_clinic_logo({
    options: { clinic_id, attachment_id },
    client = db
  }: method_payload<set_clinic_logo_payload>) {
    const sql = `
            update ${this.table_name} set logo_id = $1
                where id = $2
                returning *       
            `

    return await client
      .query(sql, [attachment_id, clinic_id])
      .then(({ rows }) => rows[0])
  }

  public async add_new_clinic({
    options: { name, country_id, address_id, phone_id, logo_id, description },
    client = db
  }: method_payload<add_clinic_payload>) {
    const default_type_id = 4

    const sql = `
            INSERT INTO ${this.table_name} (id, "name", "countryId", "addressId", "telephoneId", "clinicTypeId", logo_id, description)
                VALUES (uuid_in(overlay(overlay(md5(random()::text || ':' || clock_timestamp()::text) placing '4' from 13) placing to_hex(floor(random()*(11-8+1) + 8)::int)::text from 17)::cstring), $1, $2, $3, $4, $5, $6, $7)
                RETURNING *       
            `

    return await client
      .query(sql, [
        name,
        country_id,
        address_id,
        phone_id,
        default_type_id,
        logo_id,
        description
      ])
      .then(({ rows }) => rows[0])
  }

  public async update_clinic({
    options: { id, name, country_id, phone_id, logo_id, description },
    client = db
  }: method_payload<update_clinic_payload>) {
    const default_type_id = 4

    const filter = REGULAR_EXPRESSIONS.UUID.test(id)
      ? 'WHERE id = $1'
      : 'WHERE clinic_domain = $1'

    const sql = `
            UPDATE ${this.table_name} SET 
                "name" = $2, "countryId" = $3, "telephoneId" = $4, "clinicTypeId" = $5, logo_id = $6, description = $7
                ${filter}
                RETURNING *       
            `

    return await client
      .query(sql, [
        id,
        name,
        country_id,
        phone_id,
        default_type_id,
        logo_id,
        description
      ])
      .then(({ rows }) => rows[0])
  }

  public async get_clinic_buttons(client: Pool = db) {
    const sql = `
                SELECT c.id, c.title FROM clinic_button_list c
            `

    return await client.query(sql).then((res) => res.rows)
  }

  public async get_id_domain_button(client: Pool = db) {
    const sql = `
                SELECT c.id FROM clinic_button_list c WHERE c.has_domain = true
            `

    return await client.query(sql).then(({ rows }) => rows[0].id)
  }

  public async set_clinic_buttons({
    options: { clinic_id, buttons },
    client = db
  }: method_payload<set_clinic_buttons_payload>) {
    let sql = `
            DELETE FROM clinic_to_button WHERE clinic_id = $1
        `

    await client.query(sql, [clinic_id])

    if (buttons.length > 0) {
      const values = buttons.map(
        (item) =>
          `(${this.to_sql_string(clinic_id)}, ${item.id}, ${this.to_sql_string(
            JSON.stringify(item.action)
          )}::json)`
      )

      sql = `
                INSERT INTO clinic_to_button (clinic_id, button_id, action) VALUES ${values.join(
                  ', '
                )}
            `
      await client.query(sql)
    }
  }

  public async check_domain({
    options: { domain_name, clinic_id_or_domain },
    client = db
  }: method_payload<check_domain_payload>) {
    const checked = REGULAR_EXPRESSIONS.DOMAIN.test(domain_name)
    if (!checked) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_INVALID_DOMAIN_EX)
      ex.statusCode = 412
      throw ex
    }

    let sql = `
            SELECT * FROM ${this.table_name} WHERE clinic_domain = $1
        `

    if (clinic_id_or_domain) {
      if (REGULAR_EXPRESSIONS.UUID.test(clinic_id_or_domain))
        sql += ` AND id <> ${this.to_sql_string(clinic_id_or_domain)}`
      else return
    }

    const clinics = await client
      .query(sql, [domain_name.toLowerCase()])
      .then((res) => res.rows)

    if (clinics.length > 0) {
      const ex = new Error(EXCEPTION_MESSAGES.ON_DOMAIN_NAME_TAKEN_EX)
      ex.statusCode = 412
      throw ex
    }
  }

  public async set_domain({
    options: { clinic_id, domain_name },
    client = db
  }: method_payload<set_domain_payload>) {
    const sql = domain_name
      ? `
            UPDATE ${this.table_name} SET clinic_domain = ${this.to_sql_string(
          domain_name.toLowerCase()
        )} WHERE id = $1 RETURNING *
        `
      : `
            UPDATE ${this.table_name} SET clinic_domain = NULL WHERE id = $1 RETURNING *
        `

    return await client.query(sql, [clinic_id]).then(({ rows }) => rows[0])
  }

  public async add_attachment({
    options: { clinic_id, attachment_id, user_id },
    client = db
  }: method_payload<add_attachment_payload>) {
    const sql = `
            INSERT INTO clinic_to_attachments (attachment_id, clinic_id, created_by) VALUES ($1, $2, $3) RETURNING *
        `

    return await client
      .query(sql, [attachment_id, clinic_id, user_id])
      .then(({ rows }) => rows[0])
  }

  public async delete_attachment({
    options: { attachment_id },
    client = db
  }: method_payload<delete_attachment_payload>) {
    const sql = `
            DELETE FROM clinic_to_attachments WHERE attachment_id = $1 RETURNING *
        `

    return await client.query(sql, [attachment_id]).then(({ rows }) => rows[0])
  }

  public async set_decide({
    options: { user_id, attachment_id, is_approve, support_comment },
    client = db
  }: method_payload<set_decide_payload>) {
    const sql = `
            UPDATE clinic_to_attachments SET 
                is_approve = $1,
                decide_date = now(),
                decide_by = $2,
                support_comment = $3
            WHERE attachment_id = $4
            RETURNING *
        `

    return await client
      .query(sql, [is_approve, user_id, support_comment, attachment_id])
      .then(({ rows }) => rows[0])
  }

  public async set_clinic_approve({
    options: { user_id, is_approve, clinic_id },
    client = db
  }: method_payload<set_clinic_approve_payload>) {
    const sql = `
            UPDATE clinics SET 
                approved_at = ${
                  is_approve.toString() == 'true' ? 'now()' : 'NULL'
                },
                approved_by = $1
            WHERE id = $2
            RETURNING *
        `

    return await client
      .query(sql, [user_id, clinic_id])
      .then(({ rows }) => rows[0])
  }

  public async get_attachments({
    options: { filters, offset, limit },
    client = db
  }: method_payload<get_attachments_payload>) {
    const clinic_attachments_filters = ({
      attachment_id,
      clinic_id,
      is_decide,
      is_approve
    }: get_attachments_filter_type) => {
      const filterLiterals: string[] = []
      if (attachment_id)
        filterLiterals.push(
          `cta.attachment_id = ${this.to_sql_string(attachment_id)}`
        )
      if (clinic_id)
        filterLiterals.push(`cta.clinic_id = ${this.to_sql_string(clinic_id)}`)
      if (typeof is_decide !== 'undefined')
        filterLiterals.push(
          `cta.decide_date ${
            is_decide.toString() == 'true' ? 'IS NOT' : 'IS'
          } NULL`
        )
      if (typeof is_approve !== 'undefined')
        filterLiterals.push(`cta.is_approve = ${is_approve}`)
      return filterLiterals.length
        ? `WHERE ${filterLiterals.join(' AND ')}`
        : ''
    }

    let sql = `
            SELECT
                json_build_object(
                    'id', a.id,
                    'url', a.source_url
                ) as attachment,
                json_build_object(
                    'id', c.id,
                    'name', c."name",
                    'logo',
                    CASE
                        WHEN (c.logo_id IS NOT NULL) THEN json_build_object(
                            'id', ca.id,
                            'url', ca.source_url
                        )
                    ELSE NULL END
                ) as clinic,
                cta.created_at,
                cta.created_by,
                cta.is_approve,
                cta.decide_date,
                cta.support_comment
            FROM clinic_to_attachments cta
            LEFT JOIN attachments a ON (cta.attachment_id = a.id)
            LEFT JOIN clinics c ON (cta.clinic_id = c.id)
            LEFT JOIN attachments ca ON (c.logo_id = ca.id)
            ${filters ? clinic_attachments_filters(filters) : ''}
            ORDER BY cta.created_at DESC
            ${this.handle_offset(offset)}
            ${this.handle_limit(limit)}
        `

    return await client.query(sql).then(({ rows }) => rows)
  }

  public async current_auto_booking_status({
    options: { clinic_id },
    client = db
  }: method_payload<current_auto_booking_status_payload>) {
    const clinic_sql = `SELECT auto_booking_status FROM clinics WHERE id = '${clinic_id}'`
    let clinic_data = await client.query(clinic_sql)
    return clinic_data.rows.length ? clinic_data.rows[0] : {}
  }

  public async change_auto_booking_status({
    options: { clinic_id, toggle },
    client = db
  }: method_payload<change_status_options_payload>) {
    return client
      .query(
        `UPDATE ${this.table_name} SET auto_booking_status = ${toggle} WHERE id = '${clinic_id}'`
      )
      .then(({ rowCount }: any) => rowCount)
  }

  public async current_clinic_general_settings({
    options: { clinic_id },
    client = db
  }: method_payload<current_general_settings_options_payload>) {
    const clinic_sql = `SELECT set_own_schedule, receive_payments_directly, set_own_price FROM ${this.table_name} WHERE id = '${clinic_id}'`
    let clinic_data = await client.query(clinic_sql)
    return clinic_data.rows.length ? clinic_data.rows[0] : {}
  }

  public async change_clinic_general_settings({
    options: { clinic_id, body },
    client = db
  }: method_payload<change_clinic_general_settings_payload>) {
    let update_fragment = `UPDATE ${this.table_name} SET `,
      index = 1
    delete body.clinic_id
    for (const each_key in body) {
      if (Object.keys(body).length == index)
        update_fragment += `${each_key} = ${body[each_key]}`
      else update_fragment += `${each_key} = ${body[each_key]}, `
      index++
    }
    return await client
      .query(`${update_fragment} WHERE id = '${clinic_id}'`)
      .then(({ rowCount }: any) => rowCount)
  }

  public async get_schedules_for_day({
    options: {
      schedule_id,
      waiting_room_id,
      user_id,
      clinic_id,
      consultation_type,
      date
    },
    client = db
  }: method_payload<get_schedules_for_day_payload>) {
    let duration_column,
      type_column,
      id = waiting_room_id ? waiting_room_id : user_id,
      type = waiting_room_id ? 'waiting_room_id' : 'user_id',
      from_column,
      to_column,
      interval_column,
      payment_mode_column,
      price_column,
      clinic_approved,
      payment_mode,
      payment_price,
      schedules: any = []

    const scheduled_existed = await client.query(
      `SELECT * FROM auto_booking_schedules WHERE 
      id IN (${schedule_id.join(',')}) AND ${type} = '${id}'`
    )
    if (scheduled_existed && scheduled_existed.rows.length) {
      switch (consultation_type) {
        case 'HOME_VISIT': {
          // For Personal (For Docs)
          from_column = 'home_visit_slot_from'
          to_column = 'home_visit_slot_to'
          interval_column = 'home_visit_slot_interval'
          payment_mode = 'home_visit_payment_mode'
          payment_price = 'home_visit_price'
          // For autobooking
          type_column = 'home_visit'
          duration_column = 'home_visit_duration'
          payment_mode_column = 'home_visit_payment_mode'
          price_column = 'home_visit_price'
          clinic_approved = 'home_visit_clinic_approved'
          break
        }
        case 'CLINIC_CONSULTATION': {
          // For Personal (For Docs)
          from_column = 'consultation_slot_from'
          to_column = 'consultation_slot_to'
          interval_column = 'consultation_slot_interval'
          payment_mode = 'consultation_payment_mode'
          payment_price = 'consultation_price'
          // For autobooking
          type_column = 'clinic_consultation'
          duration_column = 'clinic_consultation_duration'
          payment_mode_column = 'clinic_consultation_payment_mode'
          price_column = 'clinic_consultation_price'
          clinic_approved = 'clinic_consultation_clinic_approved'
          break
        }
        case 'ONLINE_CONSULTATION': {
          // For Personal (For Docs)
          from_column = 'online_slot_from'
          to_column = 'online_slot_to'
          interval_column = 'online_slot_interval'
          payment_mode = 'online_payment_mode'
          payment_price = 'online_price'
          // For autobooking
          type_column = 'online_consultation'
          duration_column = 'online_consultation_duration'
          payment_mode_column = 'online_consultation_payment_mode'
          price_column = 'online_consultation_price'
          clinic_approved = 'online_consultation_clinic_approved'
          break
        }
      }

      // Get Doctors's Personal Schedules
      if (user_id) {
        const clinic_position_schedule_table = 'clinic_position_schedule',
          all_schedules = await client.query(
            `
          SELECT 
          cps.id as schedule_id,
          (cps.${from_column}::timestamptz)::time as start,
          (cps.${to_column}::timestamptz)::time as finish,
          (cps.${payment_mode}) as payment_type,
          (cps.${payment_price}) as  price,
          (to_char(${from_column}::timestamp, 'YYYY-MM-DD HH24:MI:SS')) as start_timestamp,
          (to_char(${to_column}::timestamp, 'YYYY-MM-DD HH24:MI:SS')) as end_timestamp,
          TRUNC(
            (EXTRACT(EPOCH FROM ( timezone('utc', cps.${to_column}::timestamp) - timezone('utc', cps.${from_column}::timestamp))) / 60) 
            / 
            (EXTRACT (EPOCH FROM cps.${interval_column})/60)
          ) as no_of_slots, 
          (EXTRACT (EPOCH FROM cps.${interval_column})/60) as interval
          FROM ${clinic_position_schedule_table} as cps
          WHERE 
          cps.${from_column} IS NOT NULL 
          AND cps.${to_column} IS NOT NULL
          AND cps.${from_column}::date = '${date}'::date
          AND cps.${to_column}::date = '${date}'::date
          AND cps.clinic_id = '${clinic_id}' 
          AND cps.user_id = '${id}'
      `
          )
        schedules =
          all_schedules && all_schedules.rows.length ? all_schedules.rows : []
      }

      if (waiting_room_id || (user_id && !schedules.length)) {
        const auto_booking_schedules_table = 'auto_booking_schedules',
          all_schedules = await client.query(
            `
          SELECT
          ${auto_booking_schedules_table}.id as schedule_id, 
          (${auto_booking_schedules_table}."start_time"::timestamptz)::time as start,
          (${auto_booking_schedules_table}."end_time"::timestamptz)::time as finish,
          (to_char(${auto_booking_schedules_table}."start_time"::timestamp, 'YYYY-MM-DD HH24:MI:SS')) as start_timestamp,
          (to_char(${auto_booking_schedules_table}."end_time"::timestamp, 'YYYY-MM-DD HH24:MI:SS')) as end_timestamp,
          TRUNC(
            (EXTRACT(EPOCH FROM ( timezone('utc', ${auto_booking_schedules_table}."end_time"::timestamp) - timezone('utc', ${auto_booking_schedules_table}."start_time"::timestamp))) / 60) 
            / 
            (EXTRACT (EPOCH FROM ${auto_booking_schedules_table}.${duration_column})/60)
          ) as no_of_slots, 
          (EXTRACT (EPOCH FROM ${auto_booking_schedules_table}.${duration_column})/60) as interval,
          ${clinic_approved} as clinic_approved,
          ${payment_mode_column} as payment_type,
          ${price_column} as price
          from 
          ${auto_booking_schedules_table}
          where
          ${auto_booking_schedules_table}.start_time IS NOT NULL 
          AND ${auto_booking_schedules_table}.end_time IS NOT NULL 
          AND ${auto_booking_schedules_table}.${type_column} = true 
          AND ${auto_booking_schedules_table}.start_time::date = '${date}'::date 
          AND ${auto_booking_schedules_table}.end_time::date = '${date}'::date
          AND ${auto_booking_schedules_table}.id IN (${schedule_id.join(',')})
          AND ${auto_booking_schedules_table}.clinic_id = '${clinic_id}'
          AND ${auto_booking_schedules_table}.${type} = '${id}'
        `
          )
        schedules =
          all_schedules && all_schedules.rows.length ? all_schedules.rows : []
      }
    }
    return schedules
  }

  public async check_if_slot_is_available({
    options: {
      user_id,
      waiting_room_id,
      clinic_id,
      slot_started,
      slot_finished,
      date,
      event_type
    },
    client = db
  }: method_payload<check_if_slot_is_available_payload>) {
    let type_id, id
    if (user_id) {
      type_id = 'owner_id'
      id = user_id
    }
    if (waiting_room_id) {
      type_id = 'waiting_room_id'
      id = waiting_room_id
    }
    const event_table = 'event',
      sql = ` 
          SELECT 
          ev.* 
          FROM ${event_table} as ev
          LEFT JOIN event_participant as ep ON ep.event_id = ev.id
          WHERE ev.${type_id} = '${id}'
          AND ev.clinic_id = '${clinic_id}'
          AND ev.event_type = '${event_type}'
          AND (ev."start_at", ev."end_at") OVERLAPS
          ('${date} ${slot_started}'::TIMESTAMP AT TIME ZONE 'UTC','${date} ${slot_finished}'::TIMESTAMP AT TIME ZONE 'UTC')
          AND ev.is_deleted = false
          `
    return client.query(sql).then(({ rows }: any) => rows)
  }

  public get_doctors_count_in_wr({
    options: { waiting_room_id },
    client = db
  }: method_payload<get_doctors_count_in_wr_payload>) {
    const table = 'doctor_waiting_room',
      sql = `
    SELECT dwr.*, row_to_json(wr) as waiting_room FROM
    ${table} as dwr
    LEFT JOIN waiting_room as wr ON wr.id = dwr.waiting_room_id
    WHERE
    dwr.waiting_room_id IS NOT NULL AND
    dwr.waiting_room_id = '${waiting_room_id}'
    `
    return client.query(sql).then(({ rowCount, rows }: any) => {
      return { rowCount: rowCount, rows: rows }
    })
  }

  public async get_clinic_current_ehr_status({
    options: { clinic_id },
    client = db
  }: method_payload<get_clinic_current_ehr_status_payload>) {
    const clinic_sql = `
    SELECT 
    ehr_status 
    FROM ${this.table_name} 
    WHERE 
    id = '${clinic_id}'`
    const clinic_data = await client.query(clinic_sql)
    return clinic_data.rows.length ? clinic_data.rows[0] : {}
  }

  public async change_clinic_ehr_status({
    options: { clinic_id, toggle },
    client = db
  }: method_payload<change_clinic_ehr_status_payload>) {
    const existing_ehr_status = (await this.get_clinic_current_ehr_status({
      options: {
        clinic_id: clinic_id
      }
    })) as any

    if (existing_ehr_status.ehr_status === toggle) {
      const error = new Error(`Ehr status is already ${toggle}`)
      error.statusCode = 400
      throw error
    } else {
      const clinic_sql = `
      UPDATE 
      ${this.table_name} 
      SET 
      ehr_status = '${toggle}'  
      WHERE 
      id = '${clinic_id}' RETURNING *`
      const clinic_data = await client.query(clinic_sql)
      return clinic_data.rowCount ? { status: 'success' } : { status: 'failed' }
    }
  }

  public async create_approved_position_for_wr({
    options: { clinic_id, staff_id, admin_id, room_id },
    client = db
  }: method_payload<create_approved_position_for_wr_payload>) {
    const table = 'approved_position_for_wr',
      check_approved_position_for_wr = `
    SELECT * 
    FROM 
    ${table}
    where 
    clinic_id = '${clinic_id}' AND
    room_id = '${room_id}' AND
    staff_id = '${staff_id}' 
    LIMIT 1 
    `,
      check_approved_position_for_wr_insert_sql = `
    INSERT
    INTO 
    ${table} (clinic_id, admin_id, staff_id, room_id)
    VALUES ($1,$2,$3, $4)
    RETURNING *  
    `
    const { rows } = await client.query(check_approved_position_for_wr)
    if (!rows.length) {
      return client
        .query(check_approved_position_for_wr_insert_sql, [
          clinic_id,
          admin_id,
          staff_id,
          room_id
        ])
        .then(({ rows }: any) => rows)
    } else return []
  }

  public async approve_doctor_for_waiting_room({
    options: { staff_id, clinic_id, room_id },
    client = db
  }: method_payload<approve_doctor_for_waiting_room_payload>) {
    const table = 'approved_position_for_wr',
      sql = `
    UPDATE ${table}
    set  
    status = 'approved'
    WHERE
    clinic_id = '${clinic_id}' AND
    room_id = '${room_id}' AND
    staff_id = '${staff_id}'     
    `
    await client.query(sql)
  }

  public async waiting_staff_for_waiting_room({
    options: { clinic_id, room_id, limit, offset },
    client = db
  }: method_payload<waiting_staff_for_waiting_room_payload>) {
    let table = 'approved_position_for_wr',
      count_sql = `
      SELECT 
      COUNT(*) as total_count
      FROM ${table} 
      WHERE
      status = 'invited' AND
      clinic_id = '${clinic_id}' AND
      room_id = '${room_id}'
    `,
      data_sql = `
      SELECT  
      apwr.staff_id,
      apwr.room_id,
      apwr.status,
      cds."id" as department_id,
      jsonb_build_object(
        'id', u."id",
        'firstName', u."firstName",
        'lastName', u."lastName",
        'photo', u."photo",
        'medical_specialization', row_to_json(cp_med_spec),
        'medical_level', row_to_json(cp_med_lev)
      ) as staff,
      CASE
      WHEN cp.department_id is not null 
      THEN
      jsonb_build_object(
        'id', cds."id",
        'title', cds."title"
      )
      ELSE null
      END AS department
      FROM ${table} as apwr
      LEFT JOIN clinic_positions AS cp ON cp."user_id" = apwr."staff_id" AND cp."clinic_id" = apwr."clinic_id"
      LEFT JOIN clinic_department AS cds ON cds."id" = cp."department_id" 
      LEFT JOIN users AS u ON u."id" = cp."user_id"
      LEFT JOIN medical_specializations as cp_med_spec ON cp_med_spec."id" =  cp."medical_specialization_id"
      LEFT JOIN medical_levels as cp_med_lev ON cp_med_lev."id" =  cp."medical_level_id"
      WHERE
      apwr."status" = 'invited' AND
      apwr."clinic_id" = '${clinic_id}' AND
      apwr."room_id" = '${room_id}'
    `
    if (limit && offset) {
      data_sql += `LIMIT ${limit} OFFSET ${offset}`
    }

    const { rows } = await client.query(data_sql),
      {
        rows: [{ total_count }]
      } = await client.query(count_sql)

    return {
      rows: rows.length ? rows : [],
      total_count: total_count ? Number(total_count) : 0
    }
  }

  public async remove_waiting_staff_for_waiting_room({
    options: { participants, room_id },
    client = db
  }: method_payload<remove_waiting_staff_for_waiting_room_payload>) {
    let participant_string = ''
    participants.map((participant, index) => {
      if ((participants.length - 1) === index) {
        participant_string += `'${participant}'`
      } else {
        participant_string += `'${participant}',`
      }
    })
    let table = 'approved_position_for_wr',
      sql = `
        DELETE 
        FROM 
        ${table} 
        WHERE 
        staff_id IN (${participant_string}) AND
        room_id = ${room_id} AND 
        status = 'invited'
      `
    const data = await client.query(sql)
    return { success: true }
  }
}

export const clinic_api = new Api({
  table_name: 'clinics'
})
