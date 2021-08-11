import {
    create_note_payload,
    delete_notes_payload,
    get_notes_payload,
    update_notes_payload
} from './types';

import {Validate} from "../../etc/helpers";
import {monitoring_area_notes_api} from "../../features/clinic_monitoring_notes";

export class clinic_monitoring_notes_domain {
    @Validate(
        args => args[0],
        {
            user_id: "uuid",
            note: "string",
            monitoring_area_id: 'number',
            created_by: 'uuid'
        }
    )
    static async create_note({created_by, monitoring_area_id, note, user_id}: create_note_payload) {
        const {id} = await monitoring_area_notes_api.insert_record({
            options: {
                user_id,
                note,
                monitoring_area_id,
                created_by
            }
        });

        return {
            id
        }
    }

    @Validate(
        args => args[0],
        {
            monitoring_area_id: {
                type: "number",
                convert: true
            },
            user_id: {
                type: 'uuid',
                optional: true
            },
            limit: {
                type: 'number',
                optional: true,
                convert: true
            },
            offset: {
                type: 'number',
                optional: true,
                convert: true
            }
        }
    )
    static async get_notes({monitoring_area_id, user_id, limit, offset}: get_notes_payload) {
        return monitoring_area_notes_api.get_record_list({
            options: {
                filters: {
                    monitoring_area_id,
                    user_id
                },
                limit,
                offset
            }
        })
    }

    @Validate(
        args => args[0],
        {
            id: 'number',
            note: 'string'
        }
    )
    static async update_notes({id, note}: update_notes_payload) {
        await monitoring_area_notes_api.update_record({
            options: {
                filters: {
                    id
                },
                update_obj: {
                    note
                }
            }
        });

        return {
            success: true
        }
    }

    @Validate(
        args => args[0],
        {
            id: 'number'
        }
    )
    static async delete_notes({id}: delete_notes_payload) {
        const {rowCount} = await monitoring_area_notes_api.delete_record({
            options: {
                filters: {
                    id
                }
            }
        });

        return {
            success: rowCount > 0
        }
    }
}
