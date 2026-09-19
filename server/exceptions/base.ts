export interface AppErrorOptions {
    recoverable?: boolean;
    cause?: unknown;
    details?: Record<string, unknown>;
}

export abstract class AppError extends Error {
    abstract readonly code: string;
    readonly recoverable: boolean;
    readonly details?: Record<string, unknown>;

    constructor(message: string, options: AppErrorOptions = {}) {
        super(
            message,
            options.cause !== undefined ? { cause: options.cause } : undefined,
        );
        this.name = new.target.name;
        this.recoverable = options.recoverable ?? false;
        this.details = options.details;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export const errorMessage = (err: unknown): string =>
    err instanceof Error ? err.message : String(err);
