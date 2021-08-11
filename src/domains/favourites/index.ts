import {
    add_clinic_to_favourites_payload,
    add_pharmacy_to_favourites_payload,
    get_user_favourite_clinics_payload,
    get_user_favourite_pharmacies_payload,
    remove_clinic_from_favourites_payload,
    remove_pharmacy_from_favourites_payload
} from './types';
import {Validate} from "../../etc/helpers";
import {user_favourites_clinic_api} from "../../features/user_favourites_clinic/api";
import {user_favourites_pharmacies_api} from "../../features/user_favourites_pharmacies/api";

export class user_favourites_domain {
    @Validate(
        args => args[0],
        {
            user_id: 'uuid',
            clinic_id: [
                {
                    type: 'uuid'
                }, {
                    type: 'array',
                    items: 'uuid'
                }
            ]
        }
    )
    static async add_clinic_to_favourites({clinic_id, user_id}: add_clinic_to_favourites_payload) {

        if (Array.isArray(clinic_id)) {
            await Promise.all(
                clinic_id.map(id => user_favourites_clinic_api.upsert_record({
                        options: {
                            clinic_id: id,
                            user_id
                        }
                    })
                )
            )
        } else await user_favourites_clinic_api.upsert_record({
            options: {
                clinic_id,
                user_id
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
            clinic_id: 'uuid'
        }
    )
    static async remove_clinic_from_favourites({clinic_id, user_id}: remove_clinic_from_favourites_payload) {
        const {rowCount} = await user_favourites_clinic_api.delete_record({
            options: {
                filters: {
                    clinic_id,
                    user_id
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
    static async get_user_favourite_clinics({user_id}: get_user_favourite_clinics_payload) {
        return user_favourites_clinic_api.get_records_list({
            options: {
                filters: {
                    user_id
                }
            }
        })
    }

    @Validate(
        args => args[0],
        {
            user_id: 'uuid',
            pharmacy_id: [
                {
                    type: 'number'
                }, {
                    type: 'array',
                    items: 'number'
                }
            ]
        }
    )
    static async add_pharmacy_to_favourites({pharmacy_id, user_id}: add_pharmacy_to_favourites_payload) {
        if (Array.isArray(pharmacy_id)) {
            await Promise.all(
                pharmacy_id.map(
                    id => user_favourites_pharmacies_api.upsert_record({
                        options: {
                            pharmacy_id: id,
                            user_id
                        }
                    })
                )
            )
        } else await user_favourites_pharmacies_api.upsert_record({
            options: {
                pharmacy_id,
                user_id
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
            pharmacy_id: 'number'
        }
    )
    static async remove_pharmacy_from_favourites({pharmacy_id, user_id}: remove_pharmacy_from_favourites_payload) {
        const {rowCount} = await user_favourites_pharmacies_api.delete_record({
            options: {
                filters: {
                    pharmacy_id,
                    user_id
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
    static async get_user_favourite_pharmacies({user_id}: get_user_favourite_pharmacies_payload) {
        return user_favourites_pharmacies_api.get_records_list({
            options: {
                filters: {
                    user_id
                }
            }
        })
    }
}
