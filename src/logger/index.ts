import WriteStream = NodeJS.WriteStream;
import {types} from 'util'

class Logger {
    constructor(private infoStream: WriteStream, private errorStream: WriteStream) {
    }

    info(message: string): void {
        this.infoStream.write(Logger.composeLog(message));
    }

    error(error: string | Error): void {
        const message = typeof error === "string" ? error : Logger.composeErrorMessage(error);
        this.errorStream.write(Logger.composeLog(message));
    }

    static composeLog(message: string): string {
        return message.endsWith('\n') ? message : `${message}\n`;
    }

    static composeErrorMessage(error: Error): string {
        return `${error.message}\n${error.stack}`
    }
}

export const Track = (action: string) => {
    return function (target: any, name: string, descriptor: PropertyDescriptor) {
        const original = descriptor.value;

        descriptor.value = function (...args: any[]) {
            const start = +new Date();
            logger.info(`${action} started`);
            const result = original.call(this, ...args);

            if (types.isPromise(result)) {
                result.then((result: any) => {
                    logger.info(`${action} finished after ${(+new Date() - start) / 1000} seconds`);
                    return result
                })
            } else {
                logger.info(`${action} finished after ${(+new Date() - start) / 1000} seconds`)
            }
            return result
        };

        return descriptor
    }
};

//  TODO: add possibility to specify custom logs storage
export const logger = new Logger(process.stdout, process.stderr);
