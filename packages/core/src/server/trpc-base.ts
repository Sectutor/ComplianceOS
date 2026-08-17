import "../polyfill";
import { initTRPC } from "@trpc/server";
import { Context } from "./context";
import superjson from "superjson";
import { logger } from "../lib/logger";

/**
 * Custom transformer that handles both plain JSON and superjson formats.
 *
 * This allows raw HTTP requests (curl/Postman) to send plain JSON objects
 * while the frontend tRPC client continues to use superjson format.
 *
 * Input handling:
 * - If input has a `json` property → superjson format → deserialize with superjson
 * - Otherwise → plain JSON → return as-is
 *
 * Output handling:
 * - Always serialize with superjson for frontend compatibility
 */
const customTransformer = {
    /**
     * Deserialize input from client to server.
     * Supports both superjson format and plain JSON.
     */
    input: {
        deserialize: (data: unknown): unknown => {
            // Check if data is in superjson format (has `json` property)
            const maybePayload = data as { json?: unknown };
            if (data !== null && typeof data === 'object' && 'json' in data && typeof maybePayload.json === 'object') {
                try {
                    return superjson.deserialize(data as Parameters<typeof superjson.deserialize>[0]);
                } catch (e) {
                    // If superjson deserialization fails, fall through to return data as-is
                    logger.warn('[TRPC Transformer] Superjson deserialization failed, treating as plain JSON: ' + (e instanceof Error ? e.message : String(e)));
                }
            }
            // Plain JSON format - return as-is
            return data;
        },
        /**
         * Serialize input for transmission.
         */
        serialize: (data: unknown): unknown => {
            return superjson.serialize(data);
        },
    },
    output: {
        deserialize: (data: unknown): unknown => {
            if (data !== null && typeof data === 'object' && 'json' in data) {
                try {
                    return superjson.deserialize(data as Parameters<typeof superjson.deserialize>[0]);
                } catch (e) {
                    return data;
                }
            }
            return data;
        },
        serialize: (data: unknown): unknown => {
            return superjson.serialize(data);
        },
    },
};

const t = initTRPC.context<Context>().create({
    transformer: customTransformer,
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
