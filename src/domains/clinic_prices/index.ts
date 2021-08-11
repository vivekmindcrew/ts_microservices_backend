import {
    get_clinic_prices_payload,
    upsert_clinic_prices_payload
} from './types';
import {clinics_prices_api} from "../../features/clinics_prices/api";
import {Validate} from "../../etc/helpers";
import {clinic_position_api} from "../../features/clinic_position/api";
import {EXCEPTION_MESSAGES} from "../../constants";

export class clinic_prices_domain {

    @Validate(
        args => args[0],
        {
            clinic_id: {
                type: 'uuid',
                optional: true
            }
        }
    )
    static async get_clinic_prices({clinic_id}: get_clinic_prices_payload) {
        return clinics_prices_api.get_list({
            options: {
                filters: {
                    clinic_id
                }
            }
        }).then(([record])=>record)
    }

    @Validate(
        args => args[0],
        {
            clinic_id: 'uuid',
            user_id: 'uuid',
            consultation_price: 'number',
            home_visit_price: 'number',
            online_consultation_price: 'number'
        }
    )
    static async add_clinic_prices({clinic_id, user_id, consultation_price, home_visit_price, online_consultation_price}: upsert_clinic_prices_payload) {
        const [requester_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    clinic_id,
                    user_id,
                    is_admin: true
                }
            }
        });

        if (!requester_clinic_position) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_ADMIN_OF_THE_CLINIC_EX);
            ex.statusCode = 400;
            throw ex;
        }

        await clinics_prices_api.upsert_record({
            options: {
                clinic_id,
                online_consultation_price,
                home_visit_price,
                consultation_price
            }
        });

        return {
            success: true
        }
    }
}
