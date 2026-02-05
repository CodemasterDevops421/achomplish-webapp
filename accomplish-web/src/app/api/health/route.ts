import { successResponse } from "@/lib/api-utils";

// GET /api/health - Health check endpoint
export async function GET() {
    return successResponse({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
    });
}
