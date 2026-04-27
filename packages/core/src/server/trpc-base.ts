import "../polyfill";
import { initTRPC } from "@trpc/server";
import { Context } from "./context";
import superjson from "superjson";
import { logger } from "../lib/logger";

const t = initTRPC.context<Context>().create({
    transformer: superjson,
    errorFormatter({ shape, error, path, type }) {
        // `errorId` is returned to the client to help correlate user-reported issues with server logs.
        const errorId = Math.random().toString(36).slice(2, 10);
        const code = shape.data.code;

        logger.error({
            message: "[TRPC] Request failed",
            errorId,
            type,
            path,
            code,
            errorMessage: error.message,
            stackTop: error.stack?.split("\n").slice(0, 3).join("\n"),
        });

        const shouldSanitizeMessage =
            code === "INTERNAL_SERVER_ERROR" && process.env.NODE_ENV === "production";
        const publicMessage = shouldSanitizeMessage
            ? "An unexpected error occurred. Please try again."
            : shape.message;

        return {
            ...shape,
            message: publicMessage,
            data: {
                ...shape.data,
                errorId,
                zodError: error.cause instanceof Error ? error.cause.message : null,
            },
        };
    },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

export { t };
