import {PoolClient, Pool} from 'pg';
import {db} from '../../db';

export default async ({options, client = db}: { options: {user_id: string}, client?: PoolClient | Pool }) => {
    const sql = `
            SELECT * FROM invites WHERE user_id = $1;
        `;
    
    return client.query(sql, [options.user_id]).then(({rows}) => rows[0]);
}
