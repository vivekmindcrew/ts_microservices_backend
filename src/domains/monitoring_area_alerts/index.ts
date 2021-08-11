import {Validate} from '../../etc/helpers'
import {get_alerts_list_payload, mark_as_reviewed_payload} from './types';
import {monitoring_alert_reviews_api} from "../../features/monotoring_area_alerts_reviews/api";
import {monitoring_area_alerts_api} from "../../features/monitoring_area_alerts/api";

export class monitoring_area_alerts_domain {
    @Validate(
        args => args[0],
        {
            alert_id: 'number',
            user_id: 'uuid'
        }
    )
    static async create_alert({alert_id, user_id}: mark_as_reviewed_payload) {
        const record = await monitoring_alert_reviews_api.insert_record({
            options: {
                user_id,
                alert_id
            }
        });

        return {
            success: true
        }
    }

    @Validate(
        args => args[0],
        {
            patient_id: {
                type: 'uuid',
                optional: true
            },
            monitoring_area_id: {
                type: 'number',
                convert: true
            },
            limit: {
                type: 'number',
                convert: true,
                optional: true
            },
            offset: {
                type: 'number',
                convert: true,
                optional: true
            },
            reviewed: {
                type: 'boolean',
                convert: true,
                optional: true
            }
        }
    )
    static async get_alerts({patient_id, monitoring_area_id, limit, offset, reviewed}: get_alerts_list_payload) {
        return monitoring_area_alerts_api.get_list({
            options: {
                offset,
                limit,
                reviewed: reviewed ? reviewed === 'true' : undefined,
                filters: {
                    patient_id,
                    monitoring_area_id,
                }
            }
        })
    }
}
