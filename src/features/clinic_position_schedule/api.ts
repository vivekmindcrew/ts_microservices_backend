import {
    base_api_image,
    method_payload
} from '../base_api_image'
import {
    create_record_payload,
    interval_payload,
    get_shifts_for_day_payload,
    get_time_slots
} from './types'
import {db} from "../../db";

class Api extends base_api_image {
    private interval_to_payload(payload: interval_payload) {
        return `to_timestamp(0) + INTERVAL ${this.to_sql_string(`${payload.day}d ${payload.hour}h ${payload.minute}m`)}`
    }

    public async get_shifts_for_day({options: {clinic_id, day, user_id, type}, client = db}: method_payload<get_shifts_for_day_payload>) {
        let from_column, to_column, interval_column;
        switch (type) {
            case "CONSULTATION": {
                from_column = 'consultation_slot_from';
                to_column = 'consultation_slot_to';
                interval_column = 'consultation_slot_interval';
                break;
            }
            case "HOME_VISIT": {
                from_column = 'home_visit_slot_from';
                to_column = 'home_visit_slot_to';
                interval_column = 'home_visit_slot_interval';
                break;
            }
            case "CALL": {
                from_column = 'online_slot_from';
                to_column = 'online_slot_to';
                interval_column = 'online_slot_interval';
                break;
            }
        }
        const sql = `
            SELECT to_char(${from_column} - to_timestamp(0), 'HH24:MI:SS') as start, to_char(${to_column} - to_timestamp(0), 'HH24:MI:SS') as finish, EXTRACT (EPOCH FROM ${interval_column})/60 as time_slot_interval
            FROM ${this.table_name}
            WHERE ${this.table_name}.${from_column} IS NOT NULL AND ${this.table_name}.${to_column} IS NOT NULL
            AND ${this.table_name}.${from_column} - to_timestamp(0) >= INTERVAL ${this.to_sql_string(`${day}d`)}
            AND ${this.table_name}.${to_column} - to_timestamp(0) < INTERVAL ${this.to_sql_string(`${day + 1}d`)}
            AND ${this.table_name}.clinic_id = $1 
            AND ${this.table_name}.user_id = $2
        `;

        return client.query(sql, [
            clinic_id,
            user_id
        ]).then(({rows}) => rows)
    }

    public async get_time_slots({options: {user_id, clinic_id, date, finish, start, time_slot_interval}, client = db}: method_payload<get_time_slots>) {
        const sql = `
            SELECT *
            from get_time_slots($1,$2,timestamp '${date}, ${start}',timestamp '${date}, ${finish}', INTERVAL '${time_slot_interval} m')
        `;

        const {rows} = await client.query(sql, [user_id, clinic_id]);

        return rows;
    }


    public async create_record({options: {user_id, stack_id, clinic_id, medical_specialization_id, finish, start, consultation_slot_from, consultation_slot_to, consultation_slot_interval, home_visit_slot_from, home_visit_slot_to, home_visit_slot_interval, online_slot_from, online_slot_to, online_slot_interval}, client = db}: method_payload<create_record_payload>) {
        const sql = `
            INSERT INTO ${this.table_name} (user_id, clinic_id, medical_specialization_id, start, finish, stack_id, consultation_slot_from, consultation_slot_to, consultation_slot_interval, home_visit_slot_from, home_visit_slot_to, home_visit_slot_interval, online_slot_from, online_slot_to, online_slot_interval)
            VALUES(
            $1,
            $2,
            $3,
            ${this.interval_to_payload(start)},
            ${this.interval_to_payload(finish)},
            $4, 
            ${consultation_slot_from ? this.interval_to_payload(consultation_slot_from) : null},
            ${consultation_slot_to ? this.interval_to_payload(consultation_slot_to) : null},
            ${consultation_slot_interval ? `INTERVAL '${consultation_slot_interval} m'` : null},
            ${home_visit_slot_from ? this.interval_to_payload(home_visit_slot_from) : null},
            ${home_visit_slot_to ? this.interval_to_payload(home_visit_slot_to) : null},
            ${home_visit_slot_interval ? `INTERVAL '${home_visit_slot_interval} m'` : null},
            ${online_slot_from ? this.interval_to_payload(online_slot_from) : null},
            ${online_slot_to ? this.interval_to_payload(online_slot_to) : null},
            ${online_slot_interval ? `INTERVAL '${online_slot_interval} m'` : null}
            )
            RETURNING *
        `;

        const {rows: [record]} = await client.query(
            sql,
            [
                user_id,
                clinic_id,
                medical_specialization_id || null,
                stack_id
            ]
        );

        return record;
    }
}

export const clinic_position_schedule_api = new Api({
    table_name: 'clinic_position_schedule'
});
