declare module 'http' {
    interface IncomingMessage {
        query: {
            [key: string]: any
        };
        body: {
            [key: string]: any
        };
        params: {
            [key: string]: any
        };
    }
}

declare interface Error {
    statusCode?: number;
    data?: object | []
}
