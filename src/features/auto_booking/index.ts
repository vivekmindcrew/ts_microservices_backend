import { db } from '../../db'
import { base_api_image, method_payload } from '../base_api_image'
import {
  filters_struct,
  delete_record_payload,
  upsert_record_payload,
  get_records_payload
} from './types'

class Api extends base_api_image {
  private handle_filters({ waiting_room_id }: filters_struct) {
    const filter_literals = []
    if (waiting_room_id)
      filter_literals.push(
        `${this.table_name}.waiting_room_id = ${waiting_room_id}`
      )
    return filter_literals.length
      ? `WHERE ${filter_literals.join(' AND ')}`
      : ''
  }

  // Old api
  public delete_record({
    options: { filters },
    client = db
  }: method_payload<delete_record_payload>) {
    const sql = `DELETE FROM ${this.table_name} ${this.handle_filters(filters)}`
    return client.query(sql)
  }

  // Old api
  public async get_records({
    options: { filters },
    client = db
  }: method_payload<get_records_payload>) {
    const sql = `SELECT * FROM ${this.table_name} ${this.handle_filters(
      filters
    )}`
    return client.query(sql).then(({ rows }) => rows)
  }

  // Old api
  public upsert_record({
    options: {
      waiting_room_id,
      clinic_id,
      day_of_week,
      time_from,
      time_to,
      clinic_consultation,
      clinic_consultation_duration,
      clinic_consultation_price,
      clinic_consultation_payment_mode,
      clinic_consultation_clinic_approved,
      online_consultation,
      online_consultation_duration,
      online_consultation_price,
      online_consultation_payment_mode,
      online_consultation_clinic_approved,
      home_visit,
      home_visit_duration,
      home_visit_price,
      home_visit_payment_mode,
      home_visit_clinic_approved
    },
    client = db
  }: method_payload<upsert_record_payload>) {
    const sql = `
            INSERT INTO ${this.table_name} 
            (
              waiting_room_id, 
              clinic_id, 
              day_of_week, 
              start_time, 
              end_time, 
              clinic_consultation, 
              clinic_consultation_duration, 
              clinic_consultation_price, 
              clinic_consultation_payment_mode, 
              clinic_consultation_clinic_approved, 
              online_consultation, 
              online_consultation_duration, 
              online_consultation_price, 
              online_consultation_payment_mode, 
              online_consultation_clinic_approved, 
              home_visit, 
              home_visit_duration, 
              home_visit_price,
              home_visit_payment_mode, 
              home_visit_clinic_approved
              )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
            RETURNING *
        `

    return client
      .query(sql, [
        waiting_room_id,
        clinic_id,
        day_of_week,
        `${new Date().toJSON().slice(0, 10)} ${time_from}`,
        `${new Date().toJSON().slice(0, 10)} ${time_to}`,
        clinic_consultation,
        clinic_consultation_duration,
        clinic_consultation_price,
        clinic_consultation_payment_mode,
        clinic_consultation_clinic_approved,
        online_consultation,
        online_consultation_duration,
        online_consultation_price,
        online_consultation_payment_mode,
        online_consultation_clinic_approved,
        home_visit,
        home_visit_duration,
        home_visit_price,
        home_visit_payment_mode,
        home_visit_clinic_approved
      ])
      .then(({ rows }) => rows[0])
  }
}

export const auto_booking_api = new Api({
  table_name: 'auto_booking_schedules'
})
