import {IncomingMessage, ServerResponse} from "http";
import {Response} from './response';
import {EXCEPTION_MESSAGES, WSS_BROADCAST_MESSAGE_TYPE} from '../../constants'
import web_socket from 'ws';
import Validator, {ValidationError, ValidationSchema} from "fastest-validator";

export type action_context = {
    userId?: string
    role?: string
    [key: string]: any
}

export type action_handler_payload = { ws: web_socket, req: IncomingMessage, ctx: action_context }

export type action_handler = (this: any, {ws, req, ctx}: action_handler_payload) => Promise<any>;

export function Catch(target: any, name: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;

    descriptor.value = async function ({ws, req, ctx}) {
        try {
            const value = await original.call(this, {ws, req, ctx});
            return value
        } catch (err) {

            ws.send(JSON.stringify(
                new Response({
                    error_message: err.message,
                    requested_action: ctx.data ? ctx.data.event_type : null,
                    index: ctx.data ? ctx.data.index : null,
                })
            ));
        }
    } as action_handler;

    return descriptor
}

export function ParseMessageData(target: any, name: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;

    descriptor.value = async function ({ws, req, ctx}) {

        const decoded_data = JSON.parse(ctx.data);

        return original.call(this, {ws, req, ctx: Object.assign(ctx, {data: decoded_data})})
    } as action_handler;

    return descriptor
}

export function Send(target: Object, name: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;

    descriptor.value = async function ({ws, req, ctx}) {
        const result = await original.call(this, {ws, req, ctx});
        ws.send(
            JSON.stringify(
                new Response({
                    data: result,
                    broadcast_message_type: WSS_BROADCAST_MESSAGE_TYPE.broadcast_response,
                    requested_action: ctx.data ? ctx.data.event_type : null,
                    index: ctx.data ? ctx.data.index : null,
                })
            ));

        return result;
    } as action_handler;

    return descriptor
}

export type Decoder = (token: string) => Promise<object>

export function DecodeAccessToken(decoder: Decoder) {
    return function (target: any, name: string, descriptor: PropertyDescriptor) {

        const original = descriptor.value as Function;

        descriptor.value = async function ({ws, req, ctx}) {
            const authValue = req.headers.authorization || '';

            if (!authValue || !authValue.startsWith('Bearer ')) {
                const ex = new Error(EXCEPTION_MESSAGES.ON_AUTH_FAILED_EXCEPTION);
                ex.statusCode = 403;
                throw ex;
            }

            const token = authValue.slice(7);

            const granted_token_payload = await decoder(token)
                .catch(err => {
                    err.statusCode = 401;
                    throw err;
                });

            return original.call(this, {ws, req, ctx: {...ctx, ...granted_token_payload}})
        } as action_handler;

        return descriptor;

    }
}

export function Validate(schema: ValidationSchema) {
    const validator = new Validator();

    const check = validator.compile(schema);

    return function (target: any, name: string, descriptor: PropertyDescriptor) {

        const original = descriptor.value;

        descriptor.value = async function (...args: any[]) {

            const validationResult: ValidationError[] | boolean = check(args[0].ctx);

            if (Array.isArray(validationResult)) {
                const preconditionFailedEx = new Error(validationResult.map(err => err.message).join(' and '));
                preconditionFailedEx.statusCode = 412;
                throw preconditionFailedEx;
            }

            return original.call(this, ...args)
        } as action_handler;

        return descriptor;
    }
}
