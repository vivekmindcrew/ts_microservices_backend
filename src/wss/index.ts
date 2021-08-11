import web_socket, {ClientOptions, Server} from 'ws';
import {
    action_context,
    action_handler_payload,
    Catch,
    DecodeAccessToken,
    ParseMessageData,
    Send,
    Validate
} from '../etc/ws/decorators';
import {verifyToken} from '../handlers/jwt';
import {

    EXCEPTION_MESSAGES,
    WS_EVENT_TYPES,
    WSS_BROADCAST_MESSAGE_TYPE,
    USER_TOKEN_OBTAIN_TIMEOUT_MS
} from '../constants';
import {send_message_options} from './types'
import {Response} from '../etc/ws/response'

type user_to_sockets_dictionary = {
    [k: string]: web_socket[]
}

export class WSS_manager {
    private readonly users_to_sockets: user_to_sockets_dictionary;
    private readonly wss: Server;

    constructor({options}: { options: ClientOptions }) {
        this.wss = new Server(options);
        this.users_to_sockets = {};
        this.wss.on('connection', async (ws, req) => {

            if (!req.headers.authorization) {
                const token = await this.prefetch_user_token({ws, req, ctx: {data: {event_type: 'auth'}}});
                if (!token || !token.length) return ws.close();
                req.headers.authorization = token
            }

            const result = await this.on_connection_established({ws, req, ctx: {data: {event_type: 'connection'}}});
            if (!result) return ws.close();
            const {user_id} = result;
            ws.on('close', () => this.on_socket_closed({ws, req, ctx: {user_id}}));
            ws.on('message', (data) => this.on_message_received({ws, req, ctx: {user_id, data}}));

        })
    }

    public send_broadcast_message({user_to_notify, payload: {message, broadcast_message_type}}: send_message_options): boolean {
        const is_exist = this.users_to_sockets[user_to_notify];

        if (is_exist) {
            is_exist.forEach(
                socket => socket.send(
                    JSON.stringify(
                        new Response({
                                data: message,
                                broadcast_message_type
                            }
                        )
                    )
                )
            )
        }

        return !!is_exist;
    }

    @Catch
    @Send
    @DecodeAccessToken(verifyToken)
    private async on_connection_established({ws, req, ctx}: action_handler_payload) {

        const {
            userId: user_id
        } = ctx;

        this.register_client({
            user_id: <string>user_id,
            socket: ws
        });

        return {
            user_id: <string>user_id,
            broadcast_message_type: WSS_BROADCAST_MESSAGE_TYPE.broadcast_response
        };
    };

    @Catch
    private async prefetch_user_token({ws, req, ctx}: action_handler_payload): Promise<string | undefined> {
        return new Promise((resolve, reject) => {
            const time_out_check_timer = setTimeout(() => reject(new Error(EXCEPTION_MESSAGES.ON_USER_TOKEN_OBTAIN_TIMEOUT)), USER_TOKEN_OBTAIN_TIMEOUT_MS);
            ws.once('message', async data => {
                clearTimeout(time_out_check_timer);
                const result = await this.validate_auth_payload({ctx: {...ctx, data}}).catch(err => reject(err));
                resolve(result);
            })
        })
    }

    @ParseMessageData
    @Validate({
        data: {
            type: 'object',
            props: {
                token: 'string'
            }
        }
    })
    private async validate_auth_payload({ctx}: { ctx: action_context }) {
        return ctx.data.token
    }

    private register_client({user_id, socket}: { user_id: string, socket: web_socket }): void {
        const is_exist = this.users_to_sockets[user_id];

        if (is_exist && is_exist.length) {
            this.users_to_sockets[user_id].push(socket)
        } else {
            this.users_to_sockets[user_id] = [socket]
        }
    }

    @Catch
    @Send
    @ParseMessageData
    @Validate(
        {
            data: {
                type: 'object',
                props: {
                    index: [
                        {
                            type: 'string',
                            optional: true
                        },
                        {
                            type: 'number',
                            convert: true,
                            optional: true
                        }
                    ],
                    event_type: {
                        type: 'string',
                        enum: Object.keys(WS_EVENT_TYPES)
                    }
                }
            }
        }
    )
    private async on_message_received({ctx: {user_id, data}}: action_handler_payload) {
        let result;


        return result
    }

    private async on_socket_closed({ws, ctx: {user_id}}: action_handler_payload) {
        const is_exist = (this.users_to_sockets[user_id] || []).find(user_ws => user_ws === ws);
        if (is_exist) {
            this.users_to_sockets[user_id] = this.users_to_sockets[user_id].filter(socket => socket.readyState == web_socket.OPEN);
            is_exist.close();
        }
    }
}
