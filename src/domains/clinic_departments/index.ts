import {
    create_clinic_department_payload,
    delete_clinic_department_payload,
    get_clinic_departments_payload,
    update_clinic_department_payload
} from './types'
import {Validate} from "../../etc/helpers";
import {clinic_position_api} from "../../features/clinic_position/api";
import {EXCEPTION_MESSAGES} from "../../constants";
import {clinic_department_api} from "../../features/clinic_department";
import get_or_create_telephone from "../../handlers/telephones/get_or_create";
import {clinic_department_schedules_api} from "../../features/clinic_department_schedules";

export class clinic_departments_domain {
    @Validate(
        args => args[0],
        {
            user_id: 'uuid',
            clinic_id: 'uuid',
            title: 'string',
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
    static async create_clinic_department({clinic_id, title, user_id, attachment_id, email, medical_specialization_id, schedules, telephone}: create_clinic_department_payload) {
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

        const {id} = await clinic_department_api.insert_record({
            options: {
                title,
                clinic_id,
                created_by: user_id,
                telephone_id: telephone ? await get_or_create_telephone({payload: telephone}) : null,
                email,
                medical_specialization_id,
                attachment_id
            }
        });

        if (schedules && schedules.length) await Promise.all(
            schedules.map(({day_of_week, time_from, time_to}) => clinic_department_schedules_api.upsert_record({
                options: {
                    clinic_department_id: id,
                    time_to,
                    time_from,
                    day_of_week
                }
            }))
        );

        return {
            id
        }

    }

    @Validate(
        args => args[0],
        {
            id: 'number',
            title: 'string',
            user_id: "uuid",
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
    static async update_clinic_department({id, title, user_id, attachment_id, email, medical_specialization_id, schedules, telephone}: update_clinic_department_payload) {
        const [clinic_departments_record] = await clinic_department_api.get_record_list({
            options: {
                filters: {
                    id
                }
            }
        });

        if (!clinic_departments_record) return {success: false};

        const [requester_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    clinic_id: clinic_departments_record.clinic_id,
                    user_id,
                    is_admin: true,
                }
            }
        });

        if (!requester_clinic_position) {
            const ex = new Error(EXCEPTION_MESSAGES.ON_NOT_ADMIN_OF_THE_CLINIC_EX);
            ex.statusCode = 400;
            throw ex;
        }

        await clinic_department_api.update_record({
            options: {
                filters: {
                    id
                },
                update_obj: {
                    title,
                    telephone_id: telephone ? await get_or_create_telephone({payload: telephone}) : null,
                    email,
                    medical_specialization_id,
                    attachment_id
                }
            }
        });

        await clinic_department_schedules_api.delete_record({
            options: {
                filters: {
                    clinic_department_id: id
                }
            }
        });

        if (schedules && schedules.length) await Promise.all(
            schedules.map(({day_of_week, time_from, time_to}) => clinic_department_schedules_api.upsert_record({
                options: {
                    clinic_department_id: id,
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
            clinic_id: 'uuid',
            limit: {
                type: 'number',
                convert: true,
                optional: true
            },
            offset: {
                type: 'number',
                optional: true,
                convert: true
            }
        }
    )
    static async get_clinic_departments({clinic_id, limit, offset}: get_clinic_departments_payload) {
        return clinic_department_api.get_record_list({
            options: {
                filters: {
                    clinic_id
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
            user_id: 'uuid'
        }
    )
    static async delete_clinic_department({id, user_id}: delete_clinic_department_payload) {
        const [clinic_departments_record] = await clinic_department_api.get_record_list({
            options: {
                filters: {
                    id
                }
            }
        });

        if (!clinic_departments_record) return {success: false};

        const [requester_clinic_position] = await clinic_position_api.get_records({
            options: {
                filters: {
                    clinic_id: clinic_departments_record.clinic_id,
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

        const {rowCount} = await clinic_department_api.delete_record({
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
