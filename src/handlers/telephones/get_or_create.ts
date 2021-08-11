import {PoolClient, Pool} from 'pg'
import {db} from "../../db";
import {EXCEPTION_MESSAGES, REGULAR_EXPRESSIONS} from '../../constants'

type input_struct = {
    client?: Pool | PoolClient,
    payload: {
        code: string,
        number: number
    }
}

const slice_country_code = (c_code: string) => c_code.startsWith('+') ? c_code.slice(1) : c_code;

// isolated script to be replaced with (telephones?) service call in the future
export default async ({payload: {code, number}, client = db}: input_struct) => {

    const {rows: [telephone]} = await client.query(
        `
        SELECT * 
        FROM telephones
        WHERE telephone = $1
        `,
        [code + number]
    );

    if (telephone && telephone.id) return telephone.id;

    const {rows: [country]} = await client.query(
        `
        SELECT *
        FROM countries
        WHERE $1 = ANY (countries."phoneCodes")
        `,
        [slice_country_code(code)]
    );

    if (!country) {
        const ex = new Error(EXCEPTION_MESSAGES.ON_COUNTRY_WITH_PROVIDED_CODE_DOES_NOT_EXIST_EX);
        ex.statusCode = 412;
        throw ex;
    }

    const {rows: [record]} = await client.query(
        `
        INSERT INTO telephones(id, "countryId", telephone, "countryCode", number)
        VALUES(uuid_in(overlay(overlay(md5(random()::text || ':' || clock_timestamp()::text) placing '4' from 13) placing to_hex(floor(random()*(11-8+1) + 8)::int)::text from 17)::cstring), $1, $2, $3, $4) 
        RETURNING *
        `,
        [country.id, code + number, code, number]
    );

    return record && record.id;
}
