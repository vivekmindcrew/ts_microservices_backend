import micro, {send} from 'micro';
import {IncomingMessage, ServerResponse} from "http";
import router from 'fs-router';

import * as path from 'path'
import {Response} from './etc/http/response'
import {EXCEPTION_MESSAGES} from './constants'

import {AddressInfo} from "net";
import {logger} from './logger';

const routerPath = path.resolve(__dirname, 'routes');

const match = router(routerPath);

export const server = micro(async (req: IncomingMessage, res: ServerResponse) => {
    logger.info(`${(new Date()).toISOString()}: new incoming message: ${req.method} ${req.url}`);

    const matched = match(req);

    if (matched) return await matched(req, res)
        .catch((err: Error) => {
            logger.error('Unhandled rejection detected');
            logger.error(err);
            return send(res, 418, new Response({error_message: EXCEPTION_MESSAGES.ON_UNHANDLED_ERROR_EXCEPTION}));
        });

    return send(res, 404, new Response({error_message: EXCEPTION_MESSAGES.ON_ROUTE_NOT_FOUND_EXCEPTION}))
});

const graceful = (signal?: string) => {
    logger.info(`RECEIVED ${signal} SIGNAL \n\t closing server...`);
    server.close(() => process.exit(0));
};

// Stop graceful
process.once('SIGTERM', graceful);
process.once('SIGINT', graceful);
process.on('uncaughtException', (err: Error) => {
        logger.error('Unhandled exception');
        logger.error(err);

        graceful();
    }
);
process.on('unhandledRejection', (error: {} | null | undefined, promise: Promise<any>) => {
    logger.error('Unhandled rejection');
    logger.error(<Error>error);

    graceful()
});

setInterval(() => {
    const {
        rss,
        heapTotal,
        heapUsed,
        external,
    } = process.memoryUsage();

    const to_mb = (key: string, value: number) => `${key}: ${Math.round(value / 1024 / 1024 * 100) / 100} MB`;

    logger.info(`[${(new Date()).toISOString()}] Memory usage statistics: 
   ${to_mb('rss', rss)}
   ${to_mb('heapTotal', heapTotal)}
   ${to_mb('heapUsed', heapUsed)}
   ${to_mb('external', external)}`)
}, 30000);

process.on('warning', () => logger.error);

server.once('listening', () => {
    const {
        port,
        address
    } = server.address() as AddressInfo;

    logger.info(`server listening on ${address}:${port}`)
});
