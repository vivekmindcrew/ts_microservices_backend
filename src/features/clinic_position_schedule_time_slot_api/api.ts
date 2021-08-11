import {
    base_api_image,
    method_payload
} from '../base_api_image'
import {
    create_record_payload
} from './types'
import {db} from "../../db";

class Api extends base_api_image {
    public async create_record({options: {clinic_position_schedule_id, type, start, finish, time_slot}, client = db}: method_payload<create_record_payload>) {
        const sql = `
            INSERT INTO ${this.table_name} (clinic_position_schedule_id, type, start, finish, time_slot)
            VALUES($1,$2,$3,$4, 'INTERVAL ${time_slot} m)
            RETURNING *
        `;

        const {rows: [record]} = await client.query(
            sql,
            [
                clinic_position_schedule_id,
                type,
                start,
                finish
            ]
        );

        return record;
    }
}

export const clinic_position_schedule_time_slot_api = new Api({
    table_name: 'clinic_position_schedule_time_slots'
});
