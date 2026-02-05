import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks(.*)',
    '/api/health(.*)',
    '/api/cron(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
    // Protect all routes except public ones
    if (!isPublicRoute(request)) {
        await auth.protect();
    }

    // Handle CORS preflight for API routes
    const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
    const requestOrigin = request.headers.get("origin");
    const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
    const defaultOrigin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : [defaultOrigin];
    const isAllowedOrigin = !!requestOrigin && allowedOrigins.includes(requestOrigin);
    if (isApiRoute && request.method === "OPTIONS") {
        if (!isAllowedOrigin) {
            return NextResponse.json(
                { error: "CORS origin not allowed", code: "FORBIDDEN" },
                { status: 403 }
            );
        }
        const preflight = new NextResponse(null, { status: 204 });
        preflight.headers.set("Access-Control-Allow-Origin", requestOrigin);
        preflight.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
        preflight.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        preflight.headers.set("Access-Control-Allow-Credentials", "true");
        preflight.headers.set("Vary", "Origin");
        return preflight;
    }

    // Basic CSRF protection for API mutations
    const isMutation = ["POST", "PATCH", "DELETE", "PUT"].includes(request.method);
    const isCronRoute = request.nextUrl.pathname.startsWith("/api/cron/");
    if (isApiRoute && isMutation && !isCronRoute) {
        const origin = request.headers.get("origin");
        if (!origin || origin !== request.nextUrl.origin) {
            return NextResponse.json(
                { error: "Invalid origin", code: "FORBIDDEN" },
                { status: 403 }
            );
        }
    }

    // Add security headers
    const response = NextResponse.next();
    if (isApiRoute && isAllowedOrigin) {
        response.headers.set("Access-Control-Allow-Origin", requestOrigin);
        response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        response.headers.set("Access-Control-Allow-Credentials", "true");
        response.headers.set("Vary", "Origin");
    }
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://js.posthog.com https://app.posthog.com https://hcaptcha.com https://*.hcaptcha.com; style-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https: https://hcaptcha.com https://*.hcaptcha.com; frame-src https://hcaptcha.com https://*.hcaptcha.com; frame-ancestors 'none';"
    );

    return response;
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
