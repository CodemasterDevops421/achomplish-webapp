import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { captureServerError } from "@/lib/sentry/server";

export class ApiError extends Error {
    constructor(
        public statusCode: number,
        public code: string,
        message: string,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export function handleApiError(error: unknown): NextResponse {
    console.error("API Error:", error);
    captureServerError(error);

    // Zod validation error
    if (error instanceof ZodError) {
        return NextResponse.json(
            {
                error: "Validation failed",
                code: "VALIDATION_ERROR",
                details: error.flatten().fieldErrors,
            },
            { status: 400 }
        );
    }

    // Custom API error
    if (error instanceof ApiError) {
        return NextResponse.json(
            {
                error: error.message,
                code: error.code,
                details: error.details,
            },
            { status: error.statusCode }
        );
    }

    // Database/unknown errors
    if (error instanceof Error) {
        // Don't expose internal error messages in production
        const message =
            process.env.NODE_ENV === "development"
                ? error.message
                : "An unexpected error occurred";

        return NextResponse.json(
            {
                error: message,
                code: "INTERNAL_ERROR",
            },
            { status: 500 }
        );
    }

    return NextResponse.json(
        {
            error: "An unexpected error occurred",
            code: "INTERNAL_ERROR",
        },
        { status: 500 }
    );
}

// Helper for success responses
export function successResponse<T>(data: T, status: number = 200): NextResponse {
    return NextResponse.json(data, { status });
}

// Common error factories
export const errors = {
    notFound: (resource: string) =>
        new ApiError(404, "NOT_FOUND", `${resource} not found`),

    unauthorized: () =>
        new ApiError(401, "UNAUTHORIZED", "Authentication required"),

    forbidden: () =>
        new ApiError(403, "FORBIDDEN", "Access denied"),

    badRequest: (message: string) =>
        new ApiError(400, "VALIDATION_ERROR", message),

    conflict: (message: string) =>
        new ApiError(409, "CONFLICT", message),

    tooManyRequests: () =>
        new ApiError(429, "RATE_LIMITED", "Too many requests. Please try again later."),

    timeout: (service: string) =>
        new ApiError(504, "TIMEOUT", `${service} timed out`),

    internal: (message: string) =>
        new ApiError(500, "INTERNAL_ERROR", message),
};
