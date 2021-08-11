import {
    add_clinic_media_record_payload,
    create_clinic_media_folder_payload,
    delete_clinic_media_folder_payload,
    delete_clinic_media_record_payload,
    update_clinic_media_folder_payload,
    update_clinic_media_record_payload,
    get_clinic_media_folders_payload,
    get_clinic_media_records_payload,
    add_clinic_media_access_group_participant_payload,
    create_clinic_media_access_group_payload,
    delete_clinic_media_access_group_payload,
    get_clinic_media_access_group_participant_payload,
    get_clinic_media_access_group_payload,
    remove_clinic_media_access_group_participant_payload,
    update_clinic_media_access_group_payload
} from './types';
import {Validate} from "../../etc/helpers";
import {clinic_position_api} from "../../features/clinic_position/api";
import {EXCEPTION_MESSAGES} from "../../constants";
import {clinic_media_record_api} from "../../features/clinic_media_record";
import {clinic_media_folder_api} from "../../features/clinic_media_folder";
import {clinic_media_access_group_api} from "../../features/clinic_media_access_group";
import {clinic_media_access_group_participant_api} from "../../features/clinic_media_access_group_participant";

export class clinic_media_domain {
    @Validate(
        args => args[0],
        {
            attachment_id: 'uuid',
            display_name: 'string',
            description: {
                type: 'string',
                optional: true
            },
            folder_id: {
                type: 'number',
                optional: true
            },
            section: 'string',
            user_id: 'uuid'
        }
    )
    static async add_clinic_media_record({attachment_id, display_name, folder_id, section, user_id, description}: add_clinic_media_record_payload) {
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

        const {id} = await clinic_media_record_api.insert_record({
            options: {
                attachment_id,
                section,
                display_name,
                created_by: user_id,
                clinic_id: requester_clinic_position.clinic_id,
                folder_id,
                description
            }
        });

        return {
            id
        }
    }

    @Validate(
        args => args[0],
        {
            display_name: 'string',
            folder_id: {
                type: 'number',
                optional: true
            },
            user_id: 'uuid',
            description: 'string',
            id: 'number'
        }
    )
    static async update_clinic_media_record({display_name, folder_id, id, user_id, description}: update_clinic_media_record_payload) {

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

        const rows = await clinic_media_record_api.update_record({
            options: {
                filters: {
                    id,
                    clinic_id: requester_clinic_position.clinic_id
                },
                update_obj: {
                    display_name,
                    folder_id,
                    description
                }
            }
        });

        return {
            success: rows.length > 0
        }
    }

    @Validate(
        args => args[0],
        {
            id: "number",
            user_id: "uuid"
        }
    )
    static async delete_clinic_media_record({id, user_id}: delete_clinic_media_record_payload) {
        const {rowCount} = await clinic_media_record_api.delete_record({
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
            display_name: 'string',
            parent_folder_id: {
                type: 'number',
                optional: true
            },
            section: 'string',
            user_id: 'uuid'
        }
    )
    static async add_clinic_media_folder({display_name, parent_folder_id, section, user_id}: create_clinic_media_folder_payload) {
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

        const {id} = await clinic_media_folder_api.insert_record({
            options: {
                section,
                display_name,
                created_by: user_id,
                clinic_id: requester_clinic_position.clinic_id,
                parent_folder_id: parent_folder_id || null
            }
        });

        return {
            id
        }
    }

    @Validate(
        args => args[0],
        {
            display_name: 'string',
            parent_folder_id: {
                type: 'number',
                optional: true
            },
            user_id: 'uuid',
            id: 'number',
            access_type: {
                type: 'string',
                optional: true,
                enum: ['public', 'private', 'specific_doctor_group', 'specific_patient_group', 'specific_users']
            },
            access_group_id: {
                type: 'number',
                optional: true
            },
            allowed_user_ids: {
                type: 'array',
                items: 'uuid',
                optional: true
            }
        }
    )
    static async update_clinic_media_folder({display_name, parent_folder_id, id, user_id, access_group_id, access_type, allowed_user_ids}: update_clinic_media_folder_payload) {

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

        const rows = await clinic_media_folder_api.update_record({
            options: {
                filters: {
                    id,
                    clinic_id: requester_clinic_position.clinic_id
                },
                update_obj: {
                    display_name,
                    parent_folder_id,
                    access_group_id,
                    access_type,
                    allowed_user_ids
                }
            }
        });

        return {
            success: rows.length > 0
        }
    }

    @Validate(
        args => args[0],
        {
            id: "number",
            user_id: "uuid"
        }
    )
    static async delete_clinic_media_folder({id, user_id}: delete_clinic_media_folder_payload) {
        const {rowCount} = await clinic_media_folder_api.delete_record({
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
            folder_id: {
                type: 'number',
                optional: true,
                convert: true
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
    static async get_clinic_media_records({user_id, folder_id, limit, offset}: get_clinic_media_records_payload) {
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

        return clinic_media_record_api.get_record_list({
            options: {
                filters: {
                    folder_id,
                    clinic_id: requester_clinic_position.clinic_id
                },
                offset,
                limit
            }
        })
    }

    @Validate(
        args => args[0],
        {
            user_id: 'uuid',
            parent_folder_id: {
                type: 'number',
                optional: true,
                convert: true
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
    static async get_clinic_media_folders({user_id, parent_folder_id, limit, offset}: get_clinic_media_folders_payload) {
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

        return clinic_media_folder_api.get_record_list({
            options: {
                filters: {
                    parent_folder_id: parent_folder_id || null,
                    clinic_id: requester_clinic_position.clinic_id
                },
                user_id,
                offset,
                limit
            }
        })
    }

    @Validate(
        args => args[0],
        {
            user_id: 'uuid',
            display_name: 'string',
            type: {
                type: "string",
                enum: ['patients', 'doctors']
            },
            avatar_id: {
                type: 'uuid',
                optional: true
            }
        }
    )
    static async create_clinic_media_access_group({user_id, avatar_id, display_name, type}: create_clinic_media_access_group_payload) {
        const {id} = await clinic_media_access_group_api.insert_record({
            options: {
                created_by: user_id,
                display_name,
                avatar_id,
                type
            }
        });

        return {
            id
        }
    }

    @Validate(
        args => args[0],
        {
            id: 'number',
            display_name: {
                type: 'string',
                optional: true
            },
            avatar_id: {
                type: 'uuid',
                optional: true,
            },
            user_id: 'uuid'
        }
    )
    static async update_clinic_media_access_group({id, avatar_id, display_name, user_id}: update_clinic_media_access_group_payload) {
        const [record] = await clinic_media_access_group_api.update_record({
            options: {
                filters: {
                    created_by: user_id,
                    id
                },
                update_obj: {
                    avatar_id,
                    display_name
                }
            }
        });

        return {
            record: !!record
        }
    }

    @Validate(
        args => args[0],
        {
            id: 'number',
            user_id: 'uuid'
        }
    )
    static async delete_clinic_media_access_group({id, user_id}: delete_clinic_media_access_group_payload) {
        const {rowCount} = await clinic_media_access_group_api.delete_record({
            options: {
                filters: {
                    id,
                    created_by: user_id
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
            user_id: 'uuid'
        }
    )
    static async get_clinic_media_access_groups({user_id}: get_clinic_media_access_group_payload) {
        return clinic_media_access_group_api.get_record_list({
            options: {
                filters: {
                    created_by: user_id
                }
            }
        })
    }

    @Validate(
        args => args[0],
        {
            user_id: 'uuid',
            target_id: 'uuid',
            group_id: 'number'
        }
    )
    static async add_clinic_media_access_group_participant({group_id, target_id, user_id}: add_clinic_media_access_group_participant_payload) {
        await clinic_media_access_group_participant_api.insert_record({
            options: {
                group_id,
                user_id: target_id
            }
        });

        return {
            success: true
        }
    }

    @Validate(
        args => args[0],
        {
            user_id: 'uuid',
            target_id: 'uuid',
            group_id: 'number'
        }
    )
    static async remove_clinic_media_access_group_participant({group_id, target_id, user_id}: remove_clinic_media_access_group_participant_payload) {
        const {rowCount} = await clinic_media_access_group_participant_api.delete_record({
            options: {
                filters: {
                    group_id,
                    user_id: target_id
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
            group_id: {
                type : 'number',
                convert: true
            }
        }
    )
    static async get_clinic_media_access_group_participant({user_id, group_id}: get_clinic_media_access_group_participant_payload) {
        return clinic_media_access_group_participant_api.get_record_list({
            options: {
                filters: {
                    group_id
                }
            }
        })
    }
}
