import {PoolClient, Pool} from 'pg';
import {db} from '../../db';

export default async ({options, client = db}: { options: {clinic_id: string, email?: string }, client?: PoolClient | Pool }) => {
    let sql = '';
    if (options.email) {
        sql = `
            SELECT * FROM "clinic-emails" WHERE "clinicId" = $1 AND "email" = $2 AND "deletedAt" IS NULL
        `;
        const clinic_emails =  await client.query(sql, [options.clinic_id, options.email.toLowerCase()]).then(res => res.rows);
        if (clinic_emails.length > 0 ) return clinic_emails[0];

        sql = `
            UPDATE "clinic-emails" SET "deletedAt" = now() WHERE "clinicId" = $1
        `;
        await client.query(sql, [options.clinic_id]);

        sql = `
            INSERT INTO "clinic-emails" ("clinicId", "email") VALUES ($1, $2)
        `;
        return await client.query(sql, [options.clinic_id, options.email.toLowerCase()]).then(({rows}) => rows[0]);
    }
    else {
        sql = `
            UPDATE "clinic-emails" SET "deletedAt" = now() WHERE "clinicId" = $1
        `;
        await client.query(sql, [options.clinic_id]);
    }
}
