import {
    create_patient_feedback_payload,
    get_patient_feedback_list_payload,
    update_patient_feedback_payload
} from './types';
import {sub_roles_api} from "../../features/sub_roles/api";
import {Validate} from "../../etc/helpers";
import {clinic_position_api} from "../../features/clinic_position/api";
import {EXCEPTION_MESSAGES} from "../../constants";
import {clinic_sub_roles_api} from "../../features/clinic_sub_roles/api";
import {patient_feedback_records_api} from "../../features/patient_feedback_records/api";

export class patient_feedback_domain {
    @Validate(
        args => args[0],
        {
            user_id: 'uuid',
            doctor_id: 'uuid',
            feedback: {
                type: 'string',
                optional: true
            },
            score: 'number'
        }
    )
    static async create_patient_feedback({user_id, doctor_id, feedback, score}: create_patient_feedback_payload) {
        const [doctor_active_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    user_id: doctor_id,
                    is_active: true
                }
            }
        });

        if (!doctor_active_clinic_position) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_WRONG_INPUT_EXCEPTION);
            ex.statusCode = 400;
            throw ex;
        }

        const {id} = await patient_feedback_records_api.upsert_record({
            options: {
                score,
                feedback,
                doctor_id,
                clinic_id: doctor_active_clinic_position.clinic_id,
                user_id
            }
        });

        return {
            id
        }
    }

    @Validate(
        args => args[0],
        {
            doctor_id: 'uuid',
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
    static async get_patient_feedback_list({doctor_id, limit, offset}: get_patient_feedback_list_payload) {
        const [doctor_active_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    user_id: doctor_id,
                    is_active: true
                }
            }
        });

        if (!doctor_active_clinic_position) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_WRONG_INPUT_EXCEPTION);
            ex.statusCode = 400;
            throw ex;
        }

        return patient_feedback_records_api.get_records_list({
            options: {
                offset,
                limit,
                filters: {
                    clinic_id: doctor_active_clinic_position.clinic_id,
                    doctor_id
                }
            }
        })
    }

    @Validate(
        args => args[0],
        {
            doctor_id: 'uuid',
            feedback_verified: 'boolean',
            id: 'number'
        }
    )
    static async update_patient_feedback({feedback_verified, id, doctor_id}: update_patient_feedback_payload) {
        const records = await patient_feedback_records_api.update_record({
            options: {
                filters: {
                    id,
                    doctor_id
                },
                update_obj: {
                    feedback_verified
                }
            }
        });

        return {
            success: records.length > 0
        }
    }
}
