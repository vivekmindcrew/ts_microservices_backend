import {
    add_sub_role_to_clinic_payload,
    get_available_roles_payload
} from './types';
import {sub_roles_api} from "../../features/sub_roles/api";
import {Validate} from "../../etc/helpers";
import {clinic_position_api} from "../../features/clinic_position/api";
import {EXCEPTION_MESSAGES} from "../../constants";
import {clinic_sub_roles_api} from "../../features/clinic_sub_roles/api";

export class sub_roles_domain {
    @Validate(
        args => args[0],
        {
            id: {
                type: 'number',
                optional: true
            },
            clinic_id: {
                type: 'uuid',
                optional: true
            }
        }
    )
    static async get_available_roles({id, clinic_id}: get_available_roles_payload) {
        return sub_roles_api.get_list({
            options: {
                filters: {
                    id
                },
                clinic_id
            }
        })
    }

    @Validate(
        args => args[0],
        {
            clinic_id: 'uuid',
            user_id: 'uuid',
            sub_role_id: 'number'
        }
    )
    static async add_role_to_clinic_payload({clinic_id, sub_role_id, user_id}: add_sub_role_to_clinic_payload) {
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

        await clinic_sub_roles_api.upsert_record({
            options: {
                sub_role_id,
                clinic_id
            }
        });

        return {
            success: true
        }
    }
}
