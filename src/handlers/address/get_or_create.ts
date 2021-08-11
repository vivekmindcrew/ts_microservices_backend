import {PoolClient, Pool} from 'pg';
import {db} from '../../db';

export default async ({options, client = db}: { options: {id?: number, country_id: number, zipcode?: string, state?: string, city?: string, buildingNumber?: string, apartment?: string, street: string, latitude: number, longitude: number }, client?: PoolClient | Pool }) => {
    let sql = '';
    if (options.id) {
        sql = `
            UPDATE addresses SET "countryId" = $1, postal = $2, state = $3, city = $4, street = $5, "buildingNumber" = $6, apartment = $7, latitude = $8, longitude = $9 
            WHERE id = '${options.id}'
            RETURNING *
        `
    }
    else {
        sql = `
            INSERT INTO addresses("countryId", postal, state, city, street, "buildingNumber", apartment, latitude, longitude) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `
    }

    
    return client.query(sql, [options.country_id, options.zipcode, options.state, options.city, options.street, options.buildingNumber, options.apartment, options.latitude, options.longitude]
    ).then(({rows}) => rows[0]);
}
