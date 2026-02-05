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

    // Basic CSRF protection for API mutations
    const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
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
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://js.posthog.com https://app.posthog.com; style-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
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
