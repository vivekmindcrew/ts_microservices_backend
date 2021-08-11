import amqp, {Connection, Channel} from 'amqplib';
import {EXCEPTION_MESSAGES, QUEUES_LITERALS} from '../constants'
import {logger} from '../logger';
import {db} from '../db';
import {send_notification_payload, shared_broadcast_message_payload, send_sms_payload} from './types';
import {Validate} from "../etc/helpers";

export class mq_manager {
    protected constructor(private connection: Connection, private channel: Channel) {

    }

    static async init(url?: string): Promise<mq_manager> {
        const mq_connection = await mq_manager.spawn_mq_connection(url);
        const mq_channel = await mq_manager.spawn_mq_channel(mq_connection);

        return new mq_manager(mq_connection, mq_channel)
    }

    private static async spawn_mq_connection(url?: string): Promise<Connection> {
        if (!url) throw new Error(EXCEPTION_MESSAGES.ON_BAD_START_EXCEPTION);

        const mq_connection: Connection = await amqp.connect(url);

        logger.info(`[${new Date()}]MQ: new connection spawned`);

        return mq_connection;
    };

    private static async spawn_mq_channel(connection: Connection) {
        return connection.createChannel()
    }

    public async init_send_notification_task({user_id, body, data, title, android = {}, apns = {}}: send_notification_payload) {
        const tokens = await mq_manager.get_user_fcm_token(user_id);

        return Promise.all(
            tokens.map(
                token => this.channel.sendToQueue(
                    QUEUES_LITERALS.PUSH,
                    Buffer.from(
                        JSON.stringify({
                                token,
                                title,
                                body,
                                data,
                                android,
                                apns
                            }
                        )
                    )
                )
            )
        )
    }

    public pub_broadcast_message_to_share(exchange: string, payload: shared_broadcast_message_payload) {
        return this.channel.publish(exchange, '', Buffer.from(JSON.stringify(payload)))
    }

    public async sub_on_broadcast_messages_sharing(exchange: string, handler: (arg: shared_broadcast_message_payload) => void) {
        await this.channel.assertExchange(exchange, 'fanout', {durable: true});

        const {queue: q_id} = await this.channel.assertQueue('', {exclusive: true});

        logger.info(`Received q_id: ${q_id}`);

        await this.channel.bindQueue(q_id, exchange, '');

        await this.channel.consume(q_id, async msg => {

            if (!msg) return;

            try {
                const payload = JSON.parse(msg.content.toString());

                logger.info(`New message to share ${JSON.stringify(payload)}`);

                const validated_payload = await mq_manager.check_consumed_shared_broadcast_message(payload);

                if (validated_payload.send_by !== q_id) await handler(validated_payload);

                await this.channel.ack(msg);
            } catch (err) {
                logger.error('Error while processing shared broadcast message');
                logger.error(err)
            }
        });

        return q_id
    }

    @Validate(
        args => args[0],
        {
            send_by: 'string',
            user_to_notify: 'string',
            message: {
                type: 'object',
                properties: {
                    broadcast_message_type: 'string',
                    message: 'object'
                }
            }

        }
    )
    private static async check_consumed_shared_broadcast_message(payload: any): Promise<shared_broadcast_message_payload> {
        return <shared_broadcast_message_payload>payload
    }

    private static async get_user_fcm_token(user_id: string): Promise<string[]> {
        const sql = `
               SELECT array_to_json(array_agg(DISTINCT fcm_token)) as tokens
               FROM devices
               WHERE user_id=$1 AND is_active = true
               GROUP BY user_id
            `;

        const {rows: [{tokens = []} = {}]} = await db.query(sql, [user_id]);

        return tokens;
    }

    public async init_send_sms_task({telephone, text}: send_sms_payload) {
        await this.channel.sendToQueue(
            QUEUES_LITERALS.SMS,
            Buffer.from(
                JSON.stringify({
                        telephone,
                        text
                    }
                )
            )
        )
    }

}

