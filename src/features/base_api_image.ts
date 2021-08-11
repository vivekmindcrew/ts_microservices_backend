import QueryStream from 'pg-query-stream'
import { Pool, PoolClient } from 'pg'

export type creation_options = {
  table_name: string
}

export type method_payload<options_type> = {
  options: options_type
  client?: Pool | PoolClient
}

export type check_admin_payload<options_type> = {
  options: options_type
  client?: Pool | PoolClient
}

export abstract class base_api_image {
  protected readonly table_name: string

  constructor({ table_name }: creation_options) {
    this.table_name = table_name
  }

  protected to_sql_string(value: string | Date) {
    return `$$${value}$$`
  }

  protected to_sql_timestamp_with_time_zone(value: Date) {
    return (
      this.to_sql_string(new Date(value).toISOString()) +
      '::TIMESTAMP WITH TIME ZONE'
    )
  }

  protected inject_query_stream({ sql }: { sql: string }) {
    return new QueryStream(sql)
  }

  protected is_date_valid(value: Date | string | number) {
    return !isNaN(+new Date(value))
  }

  protected handle_limit(limit?: number) {
    return limit ? `LIMIT ${limit}` : ''
  }

  protected handle_offset(offset?: number) {
    return offset ? `OFFSET ${offset}` : ''
  }
}
