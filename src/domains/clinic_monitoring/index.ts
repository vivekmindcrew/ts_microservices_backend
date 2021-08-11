import {
    create_clinic_monitoring_area_payload,
    delete_clinic_monitoring_area_payload,
    add_clinic_monitoring_area_patient_payload,
    add_clinic_monitoring_area_stuff_payload,
    remove_clinic_monitoring_area_patient_payload,
    remove_clinic_monitoring_area_stuff_payload,
    get_clinic_monitoring_area_list_payload,
    get_clinic_monitoring_area_patients_list_payload,
    get_clinic_monitoring_area_stuff_list_payload,
    get_available_clinic_monitoring_areas_payload,
    update_clinic_monitoring_area_payload,
    get_clinic_monitoring_area_patient_aggregated_info_payload,
    get_monitoring_patients_payload
} from './types'
import {Validate} from "../../etc/helpers";
import {clinic_position_api} from "../../features/clinic_position/api";
import {EXCEPTION_MESSAGES} from "../../constants";
import {clinic_monitoring_area_api} from "../../features/clinic_monitoring_area";
import {clinic_subscription_api} from "../../features/clinic_subscription/api";
import {clinic_monitoring_area_stuff_api} from "../../features/clinic_monitoring_area_stuff/api";
import {clinic_monitoring_area_patients_api} from "../../features/clinic_monitoring_area_patients/api";
import get_or_create_telephone from '../../handlers/telephones/get_or_create';
import {monitoring_area_schedule_api} from "../../features/monitoring_area_schedule";

export class clinic_monitoring_domain {
    @Validate(
        args => args[0],
        {
            id: 'number',
            user_id: 'uuid',
            clinic_id: 'uuid',
            name: 'string',
            attachment_id: {
                type: 'uuid',
                optional: true
            },
            email: {
                type: 'string',
                optional: true
            },
            medical_specialization_id: {
                type: 'number',
                optional: true
            },
            telephone: {
                type: 'object',
                props: {
                    code: {
                        type: 'string'
                    },
                    number: {
                        type: 'number'
                    }
                },
                optional: true
            },
            schedules: {
                type: 'array',
                optional: true,
                items: {
                    type: 'object',
                    props: {
                        day_of_week: 'number',
                        time_from: 'string',
                        time_to: 'string'
                    }
                }
            }
        }
    )
    static async update_clinic_monitoring_area({id, attachment_id, clinic_id, email, medical_specialization_id, name, schedules, telephone, user_id}: update_clinic_monitoring_area_payload) {
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

        const [clinic_subscription_record] = await clinic_subscription_api.get_list({
            options: {
                filters: {
                    clinic_id
                }
            }
        });

        if (!clinic_subscription_record || clinic_subscription_record.monitoring_end_date < new Date()) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_UPDATE_SUBSCRIPTION_EX);
            ex.statusCode = 400;
            throw ex;
        }

        const [{id: monitoring_area_id}] = await clinic_monitoring_area_api.update_record({
            options: {
                filters: {
                    id
                },
                update_obj: {
                    name,
                    telephone_id: telephone ? await get_or_create_telephone({payload: telephone}) : null,
                    email,
                    medical_specialization_id,
                    attachment_id
                }
            }
        });

        await monitoring_area_schedule_api.delete_record({
            options: {
                filters: {
                    monitoring_area_id
                }
            }
        })

        if (schedules && schedules.length) await Promise.all(
            schedules.map(({day_of_week, time_from, time_to}) => monitoring_area_schedule_api.upsert_record({
                options: {
                    monitoring_area_id: id,
                    time_to,
                    time_from,
                    day_of_week
                }
            }))
        );

        return {
            success: true
        }
    }

    @Validate(
        args => args[0],
        {
            user_id: 'uuid',
            clinic_id: 'uuid',
            name: 'string',
            attachment_id: {
                type: 'uuid',
                optional: true
            },
            email: {
                type: 'string',
                optional: true
            },
            medical_specialization_id: {
                type: 'number',
                optional: true
            },
            telephone: {
                type: 'object',
                props: {
                    code: {
                        type: 'string'
                    },
                    number: {
                        type: 'number'
                    }
                },
                optional: true
            },
            schedules: {
                type: 'array',
                optional: true,
                items: {
                    type: 'object',
                    props: {
                        day_of_week: 'number',
                        time_from: 'string',
                        time_to: 'string'
                    }
                }
            }
        }
    )
    static async create_clinic_monitoring_area({user_id, attachment_id, clinic_id, name, email, medical_specialization_id, schedules, telephone}: create_clinic_monitoring_area_payload) {
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

        const [clinic_subscription_record] = await clinic_subscription_api.get_list({
            options: {
                filters: {
                    clinic_id
                }
            }
        });

        if (!clinic_subscription_record || clinic_subscription_record.monitoring_end_date < new Date()) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_UPDATE_SUBSCRIPTION_EX);
            ex.statusCode = 400;
            throw ex;
        }

        const {id} = await clinic_monitoring_area_api.insert_record({
            options: {
                name,
                created_by: user_id,
                clinic_id,
                telephone_id: telephone ? await get_or_create_telephone({payload: telephone}) : null,
                email,
                medical_specialization_id,
                attachment_id
            }
        });

        if (schedules && schedules.length) await Promise.all(
            schedules.map(({day_of_week, time_from, time_to}) => monitoring_area_schedule_api.upsert_record({
                options: {
                    monitoring_area_id: id,
                    time_to,
                    time_from,
                    day_of_week
                }
            }))
        );

        return {
            id
        };
    }

    @Validate(
        args => args[0],
        {
            id: 'number',
            user_id: 'uuid'
        }
    )
    static async delete_clinic_monitoring_area({id, user_id}: delete_clinic_monitoring_area_payload) {

        const [monitoring_area_obj] = await clinic_monitoring_area_api.get_record_list({
            options: {
                filters: {
                    id
                }
            }
        });

        if (!monitoring_area_obj) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_WRONG_INPUT_EXCEPTION);
            ex.statusCode = 412;
            throw ex;
        }

        const [requester_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    clinic_id: monitoring_area_obj.clinic_id,
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

        const {rowCount} = await clinic_monitoring_area_api.delete_record({
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

    @Validate(
        args => args[0],
        {
            user_id: 'uuid',
            clinic_id: 'uuid'
        }
    )
    static async get_available_clinic_monitoring_areas({clinic_id, user_id}: get_available_clinic_monitoring_areas_payload) {
        const [requester_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    clinic_id,
                    user_id,
                }
            }
        });

        if (!requester_clinic_position) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_CLINIC_STUFF_EX);
            ex.statusCode = 400;
            throw ex;
        }

        return clinic_monitoring_area_api.get_record_list({
            options: {
                filters: {
                    clinic_id
                },
                checked_in_user_id: user_id
            }
        })
    }

    @Validate(
        args => args[0],
        {
            user_id: 'uuid',
            clinic_id: 'uuid'
        }
    )
    static async get_clinic_monitoring_area_list({clinic_id, user_id}: get_clinic_monitoring_area_list_payload) {
        const [requester_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    clinic_id,
                    user_id,
                }
            }
        });

        if (!requester_clinic_position) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_CLINIC_STUFF_EX);
            ex.statusCode = 400;
            throw ex;
        }

        return clinic_monitoring_area_api.get_record_list({
            options: {
                filters: {
                    clinic_id
                }
            }
        })
    }

    @Validate(
        args => args[0],
        {
            monitoring_area_id: 'number',
            target_id: 'uuid',
            user_id: 'uuid'
        }
    )
    static async add_clinic_monitoring_area_stuff({monitoring_area_id, target_id, user_id}: add_clinic_monitoring_area_stuff_payload) {

        const [monitoring_area_obj] = await clinic_monitoring_area_api.get_record_list({
            options: {
                filters: {
                    id: monitoring_area_id
                }
            }
        });

        if (!monitoring_area_obj) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_WRONG_INPUT_EXCEPTION);
            ex.statusCode = 412;
            throw ex;
        }

        const [requester_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    clinic_id: monitoring_area_obj.clinic_id,
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

        const [clinic_subscription_record] = await clinic_subscription_api.get_list({
            options: {
                filters: {
                    clinic_id: monitoring_area_obj.clinic_id
                }
            }
        });

        if (!clinic_subscription_record || clinic_subscription_record.monitoring_end_date < new Date()) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_UPDATE_SUBSCRIPTION_EX);
            ex.statusCode = 400;
            throw ex;
        }

        await clinic_monitoring_area_stuff_api.upsert_record(({
            options: {
                user_id: target_id,
                monitoring_area_id
            }
        }));

        return {
            success: true
        }
    }

    @Validate(
        args => args[0],
        {
            monitoring_area_id: 'number',
            target_id: 'uuid',
            user_id: 'uuid'
        }
    )
    static async remove_clinic_monitoring_area_stuff({monitoring_area_id, target_id, user_id}: remove_clinic_monitoring_area_stuff_payload) {
        const [monitoring_area_obj] = await clinic_monitoring_area_api.get_record_list({
            options: {
                filters: {
                    id: monitoring_area_id
                }
            }
        });

        if (!monitoring_area_obj) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_WRONG_INPUT_EXCEPTION);
            ex.statusCode = 412;
            throw ex;
        }

        const [requester_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    clinic_id: monitoring_area_obj.clinic_id,
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

        const {rowCount} = await clinic_monitoring_area_stuff_api.delete_record({
            options: {
                filters: {
                    user_id: target_id,
                    monitoring_area_id
                }
            }
        });

        return {
            success: rowCount > 0
        }
    }


    @Validate(
        args => args[0],
        {
            monitoring_area_id: 'number',
            target_id: 'uuid',
            user_id: 'uuid'
        }
    )
    static async add_clinic_monitoring_area_patient({monitoring_area_id, target_id, user_id}: add_clinic_monitoring_area_patient_payload) {

        const [monitoring_area_obj] = await clinic_monitoring_area_api.get_record_list({
            options: {
                filters: {
                    id: monitoring_area_id
                }
            }
        });

        if (!monitoring_area_obj) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_WRONG_INPUT_EXCEPTION);
            ex.statusCode = 412;
            throw ex;
        }

        const [requester_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    clinic_id: monitoring_area_obj.clinic_id,
                    user_id
                }
            }
        });

        if (!requester_clinic_position) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_CLINIC_STUFF_EX);
            ex.statusCode = 400;
            throw ex;
        }

        const [clinic_subscription_record] = await clinic_subscription_api.get_list({
            options: {
                filters: {
                    clinic_id: monitoring_area_obj.clinic_id
                }
            }
        });

        if (!clinic_subscription_record || clinic_subscription_record.monitoring_end_date < new Date()) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_UPDATE_SUBSCRIPTION_EX);
            ex.statusCode = 400;
            throw ex;
        }

        const clinic_monitoring_patients = await clinic_monitoring_area_patients_api.get_records_list({
            options: {
                filters: {
                    monitoring_area_id
                }
            }
        });

        if (clinic_subscription_record.monitoring_patients_count <= clinic_monitoring_patients.length) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_MONITORING_PATIENTS_LIMIT_REACHED_EX);
            ex.statusCode = 412;
            throw ex;
        }

        await clinic_monitoring_area_patients_api.upsert_record(({
            options: {
                user_id: target_id,
                monitoring_area_id
            }
        }));

        return {
            success: true
        }
    }

    @Validate(
        args => args[0],
        {
            monitoring_area_id: 'number',
            target_id: 'uuid',
            user_id: 'uuid'
        }
    )
    static async remove_clinic_monitoring_area_patient({monitoring_area_id, target_id, user_id}: remove_clinic_monitoring_area_patient_payload) {
        const [monitoring_area_obj] = await clinic_monitoring_area_api.get_record_list({
            options: {
                filters: {
                    id: monitoring_area_id
                }
            }
        });

        if (!monitoring_area_obj) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_WRONG_INPUT_EXCEPTION);
            ex.statusCode = 412;
            throw ex;
        }

        const [requester_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    clinic_id: monitoring_area_obj.clinic_id,
                    user_id
                }
            }
        });

        if (!requester_clinic_position) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_CLINIC_STUFF_EX);
            ex.statusCode = 400;
            throw ex;
        }

        await clinic_monitoring_area_patients_api.delete_record({
            options: {
                filters: {
                    monitoring_area_id,
                    user_id: target_id
                }
            }
        })
    }

    @Validate(
        args => args[0],
        {
            monitoring_area_id: {
                type: 'number',
                convert: true
            },
            user_id: 'uuid'
        }
    )
    static async get_clinic_monitoring_area_patients_list({monitoring_area_id, user_id}: get_clinic_monitoring_area_patients_list_payload) {
        const [monitoring_area_obj] = await clinic_monitoring_area_api.get_record_list({
            options: {
                filters: {
                    id: monitoring_area_id
                }
            }
        });

        if (!monitoring_area_obj) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_WRONG_INPUT_EXCEPTION);
            ex.statusCode = 412;
            throw ex;
        }

        const [requester_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    clinic_id: monitoring_area_obj.clinic_id,
                    user_id
                }
            }
        });

        if (!requester_clinic_position) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_CLINIC_STUFF_EX);
            ex.statusCode = 400;
            throw ex;
        }

        return clinic_monitoring_area_patients_api.get_records_list({
            options: {
                filters: {
                    monitoring_area_id
                }
            }
        })
    }

    @Validate(
        args => args[0],
        {
            monitoring_area_id: {
                type: 'number',
                convert: true
            },
            user_id: 'uuid'
        }
    )
    static async get_clinic_monitoring_area_stuff_list({monitoring_area_id, user_id}: get_clinic_monitoring_area_stuff_list_payload) {
        const [monitoring_area_obj] = await clinic_monitoring_area_api.get_record_list({
            options: {
                filters: {
                    id: monitoring_area_id
                }
            }
        });

        if (!monitoring_area_obj) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_WRONG_INPUT_EXCEPTION);
            ex.statusCode = 412;
            throw ex;
        }

        const [requester_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    clinic_id: monitoring_area_obj.clinic_id,
                    user_id
                }
            }
        });

        if (!requester_clinic_position) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_CLINIC_STUFF_EX);
            ex.statusCode = 400;
            throw ex;
        }

        return clinic_monitoring_area_stuff_api.get_records_list({
            options: {
                filters: {
                    monitoring_area_id
                }
            }
        })
    }

    @Validate(
        args => args[0],
        {
            user_id : 'uuid',
            alert_levels : {
                type : 'array',
                optional: true,
                items: 'string'
            },
            alert_types : {
                type : 'array',
                optional: true,
                items: 'string'
            },
            patient_ids : {
                type : 'array',
                optional: true,
                items: 'string'
            },
            limit : {
                type : 'number',
                optional: true,
            },
            offset :  {
                type : 'number',
                optional: true,
            },
            monitoring_area_ids : {
                type : 'array',
                optional: true,
                items: 'number'
            },
            search : {
                type : 'string',
                optional: true
            }
        }
    )
    static async get_clinic_monitoring_area_patient_aggregated_list({user_id, alert_levels, alert_types, limit, monitoring_area_ids, offset, patient_ids, search}: get_clinic_monitoring_area_patient_aggregated_info_payload) {

        const [requester_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    user_id,
                    is_active: true
                }
            }
        });

        if (!requester_clinic_position) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_CLINIC_STUFF_EX);
            ex.statusCode = 400;
            throw ex;
        }

        const [rows, total_count] = await Promise.all([
            clinic_monitoring_area_api.get_monitoring_aggregated_records({
                options: {
                    offset,
                    limit,
                    filters: {
                        patient_ids,
                        alert_types,
                        ids: monitoring_area_ids,
                        alert_levels,
                        clinic_id: requester_clinic_position.clinic_id,
                        search
                    }
                }
            }),
            clinic_monitoring_area_api.get_monitoring_aggregated_records_total_count({
                options: {
                    filters: {
                        patient_ids,
                        alert_types,
                        ids: monitoring_area_ids,
                        alert_levels,
                        clinic_id: requester_clinic_position.clinic_id,
                        search
                    }
                }
            })
        ]);

        return {
            rows,
            total_count : Number(total_count)
        }
    }

    @Validate(
        args => args[0],
        {
            user_id: 'uuid',
            monitoring_area_ids : {
                type : 'array',
                optional: true,
                items: "number"
            }
        }
    )
    static async get_monitoring_patients({user_id,monitoring_area_ids } : get_monitoring_patients_payload){
        const [requester_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    user_id,
                    is_active: true
                }
            }
        });

        if (!requester_clinic_position) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_CLINIC_STUFF_EX);
            ex.statusCode = 400;
            throw ex;
        }

        return clinic_monitoring_area_api.get_monitoring_patients({
            options : {
                filters :{
                    ids : monitoring_area_ids,
                    clinic_id : requester_clinic_position.clinic_id
                }
            }
        })
    }
}
