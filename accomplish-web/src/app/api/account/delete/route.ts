import { auth, clerkClient } from "@clerk/nextjs/server";
import { handleApiError, successResponse, errors } from "@/lib/api-utils";
import { db, entries, generatedOutputs, userSettings, rateLimits } from "@/lib/db";
import { eq } from "drizzle-orm";
import { captureServerError } from "@/lib/sentry/server";

// DELETE /api/account/delete - Delete user data (and optionally Clerk user)
export async function DELETE() {
    try {
        const { userId } = await auth();
        if (!userId) throw errors.unauthorized();

        await db.delete(generatedOutputs).where(eq(generatedOutputs.userId, userId));
        await db.delete(rateLimits).where(eq(rateLimits.userId, userId));
        await db.delete(userSettings).where(eq(userSettings.userId, userId));
        await db.delete(entries).where(eq(entries.userId, userId));

        if (process.env.DELETE_CLERK_ON_ACCOUNT_DELETE === "true") {
            try {
                const clerk = await clerkClient();
                await clerk.users.deleteUser(userId);
            } catch (error) {
                captureServerError(error, { scope: "account_delete", userId });
            }
        }

        return successResponse({ message: "Account deleted" });
    } catch (error) {
        return handleApiError(error);
    }
}
