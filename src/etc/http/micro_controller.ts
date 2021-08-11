import { IncomingMessage, ServerResponse } from 'http'
import { send, json, sendError } from 'micro'
import { Response } from './response'
import Validator, { ValidationError, ValidationSchema } from 'fastest-validator'
import { EXCEPTION_MESSAGES } from '../../constants'
import { ReadStream } from 'fs'

export type handler_context = {
  userId?: string
  role?: string
  [key: string]: any
}

export type route_handler = (
  req: IncomingMessage,
  res: ServerResponse,
  ctx: handler_context
) => Promise<any>

export interface MicroController {
  GET?: route_handler
  POST?: route_handler
  PUT?: route_handler
  PATCH?: route_handler
  DELETE?: route_handler
}

export function Send(status: number) {
  return function (target: any, name: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value

    descriptor.value = async function (
      req: IncomingMessage,
      res: ServerResponse,
      ctx: handler_context
    ) {
      const result = await original.call(this, req, res, ctx)
      return send(res, status, new Response({ data: result }))
    }

    return descriptor
  }
}

export function Pipe(
  target: any,
  name: string,
  descriptor: PropertyDescriptor
) {
  const original = descriptor.value

  descriptor.value = async function (
    req: IncomingMessage,
    res: ServerResponse,
    ctx: handler_context
  ) {
    const result_read_stream: ReadStream = await original.call(
      this,
      req,
      res,
      ctx
    )
    result_read_stream.pipe(res)
  }

  return descriptor
}

export function ParseBody(
  target: any,
  name: string,
  descriptor: PropertyDescriptor
) {
  const original = descriptor.value

  descriptor.value = async function (
    req: IncomingMessage,
    res: ServerResponse,
    ctx: handler_context
  ) {
    req.body = await json(req)

    return original.call(this, req, res, ctx)
  }

  return descriptor
}

export function Catch(
  target: any,
  name: string,
  descriptor: PropertyDescriptor
) {
  const original = descriptor.value

  descriptor.value = async function (
    req: IncomingMessage,
    res: ServerResponse,
    ctx: handler_context
  ) {
    try {
      await original.call(this, req, res, ctx)
    } catch (err) {
      return send(
        res,
        err.statusCode || 500,
        new Response({ error_message: err.message, data: err.data })
      )
    }
  }

  return descriptor
}

export function Validate(schema: ValidationSchema) {
  const validator = new Validator()

  const check = validator.compile(schema)

  return function (target: any, name: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value

    descriptor.value = async function (
      req: IncomingMessage,
      res: ServerResponse,
      ctx: handler_context
    ) {
      const { query, body, params } = req

      const validationResult: ValidationError[] | boolean = check({
        query,
        body,
        params
      })

      if (Array.isArray(validationResult)) {
        const preconditionFailedEx = new Error(
          validationResult.map((err) => err.message).join(' and ')
        )
        preconditionFailedEx.statusCode = 412
        throw preconditionFailedEx
      }

      return original.call(this, req, res, ctx)
    }

    return descriptor
  }
}

export type Decoder = (token: string) => Promise<object>

export function DecodeAccessToken(decoder: Decoder) {
  return function (target: any, name: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value as Function

    descriptor.value = async function (
      req: IncomingMessage,
      res: ServerResponse,
      ctx: handler_context
    ) {
      const authValue = req.headers.authorization || ''

      if (!authValue || !authValue.startsWith('Bearer ')) {
        const ex = new Error(EXCEPTION_MESSAGES.ON_AUTH_FAILED_EXCEPTION)
        ex.statusCode = 403
        throw ex
      }

      const token = authValue.slice(7)

      const granted_token_payload = await decoder(token).catch((err) => {
        err.statusCode = 401
        throw err
      })

      return original.call(this, req, res, { ...ctx, ...granted_token_payload })
    }

    return descriptor
  }
}

export function AcceptACL(role: string | string[]) {
  const roles = Array.isArray(role) ? role : [role]

  return function (target: any, name: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value

    descriptor.value = async function (
      req: IncomingMessage,
      res: ServerResponse,
      ctx: handler_context & { role: string }
    ) {
      if (!roles.find((role) => role === ctx.role)) {
        const ex = new Error(EXCEPTION_MESSAGES.ON_ACCESS_DENIED_EXCEPTION)
        ex.statusCode = ctx.role ? 403 : 401
        throw ex
      }

      return original.call(this, req, res, ctx)
    }

    return descriptor
  }
}

export function SetHeader(
  header_name: string,
  header_value: number | string | string[]
) {
  return function (target: any, name: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value

    descriptor.value = async function (
      req: IncomingMessage,
      res: ServerResponse,
      ctx: handler_context
    ) {
      const result = await original.call(this, req, res, ctx)
      res.setHeader(header_name, header_value)
      return result
    }

    return descriptor
  }
}
