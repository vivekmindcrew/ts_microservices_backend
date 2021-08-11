import {Validate} from '../../etc/helpers'
import {get_list_payload} from './types'
import {medical_specializations_api} from '../../features/medical_specialization/api'

export class medical_specialization_domain {
    @Validate(
        args => args[0],
        {
            id: {
                type: 'number',
                optional: true
            },
            count: {
                type: 'number',
                optional: true,
                convert: true
            },
            page: {
                type: 'number',
                optional: true,
                convert: true
            }
        }
    )
    static async get_list({id, count, page}: get_list_payload) {

        return medical_specializations_api.get_list({
            options: {
                limit: count ? count : undefined,
                offset: count && page ? count * (page - 1) : 0,
                filters: {
                    id
                },
            }
        });


    }
}
