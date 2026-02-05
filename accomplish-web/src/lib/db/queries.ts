import { db, entries, entryEnrichments } from "./index";
import type { Entry, EntryEnrichment } from "./schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { format } from "date-fns";

export type EntryWithEnrichment = Entry & {
    enrichment: EntryEnrichment | null;
};

// Type for join result
type JoinResult = {
    entries: Entry;
    entry_enrichments: EntryEnrichment | null;
};

// Get today's date in YYYY-MM-DD format
export function getTodayDate(): string {
    return format(new Date(), "yyyy-MM-dd");
}

// Get entry for a specific user and date
export async function getEntryByDate(
    userId: string,
    entryDate: string
): Promise<EntryWithEnrichment | null> {
    const result = await db
        .select()
        .from(entries)
        .leftJoin(entryEnrichments, eq(entries.id, entryEnrichments.entryId))
        .where(
            and(
                eq(entries.userId, userId),
                eq(entries.entryDate, entryDate),
                isNull(entries.deletedAt)
            )
        )
        .limit(1);

    if (result.length === 0) return null;

    const row = result[0];
    return {
        ...row.entries,
        enrichment: row.entry_enrichments,
    };
}

// Get paginated entries for a user
export async function getEntriesPaginated(
    userId: string,
    page: number,
    limit: number
): Promise<{ entries: EntryWithEnrichment[]; total: number; hasMore: boolean }> {
    const offset = (page - 1) * limit;

    // Get entries with enrichments
    const result = await db
        .select()
        .from(entries)
        .leftJoin(entryEnrichments, eq(entries.id, entryEnrichments.entryId))
        .where(and(eq(entries.userId, userId), isNull(entries.deletedAt)))
        .orderBy(desc(entries.entryDate))
        .limit(limit)
        .offset(offset);

    // Get total count
    const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(entries)
        .where(and(eq(entries.userId, userId), isNull(entries.deletedAt)));

    const total = Number(countResult[0]?.count ?? 0);

    const entriesWithEnrichments: EntryWithEnrichment[] = result.map((row: JoinResult) => ({
        ...row.entries,
        enrichment: row.entry_enrichments,
    }));

    return {
        entries: entriesWithEnrichments,
        total,
        hasMore: offset + result.length < total,
    };
}

// Create or update entry for a date (upsert)
export async function upsertEntry(
    userId: string,
    rawText: string,
    entryDate?: string
): Promise<Entry> {
    const date = entryDate || getTodayDate();

    // Check if entry exists for this date
    const existing = await db
        .select()
        .from(entries)
        .where(
            and(
                eq(entries.userId, userId),
                eq(entries.entryDate, date),
                isNull(entries.deletedAt)
            )
        )
        .limit(1);

    if (existing.length > 0) {
        // Update existing entry
        const updated = await db
            .update(entries)
            .set({
                rawText,
                updatedAt: new Date(),
            })
            .where(eq(entries.id, existing[0].id))
            .returning();

        return updated[0];
    } else {
        // Create new entry
        const created = await db
            .insert(entries)
            .values({
                userId,
                entryDate: date,
                rawText,
            })
            .returning();

        return created[0];
    }
}

// Update an entry by ID
export async function updateEntry(
    entryId: string,
    userId: string,
    rawText: string
): Promise<Entry | null> {
    const result = await db
        .update(entries)
        .set({
            rawText,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(entries.id, entryId),
                eq(entries.userId, userId),
                isNull(entries.deletedAt)
            )
        )
        .returning();

    return result[0] || null;
}

// Soft delete an entry
export async function softDeleteEntry(
    entryId: string,
    userId: string
): Promise<boolean> {
    const result = await db
        .update(entries)
        .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(entries.id, entryId),
                eq(entries.userId, userId),
                isNull(entries.deletedAt)
            )
        )
        .returning();

    return result.length > 0;
}

// Get entry by ID
export async function getEntryById(
    entryId: string,
    userId: string
): Promise<EntryWithEnrichment | null> {
    const result = await db
        .select()
        .from(entries)
        .leftJoin(entryEnrichments, eq(entries.id, entryEnrichments.entryId))
        .where(
            and(
                eq(entries.id, entryId),
                eq(entries.userId, userId),
                isNull(entries.deletedAt)
            )
        )
        .limit(1);

    if (result.length === 0) return null;

    const row = result[0];
    return {
        ...row.entries,
        enrichment: row.entry_enrichments,
    };
}

// Save AI enrichment for an entry
export async function saveEnrichment(
    entryId: string,
    enrichment: {
        aiProvider: string;
        aiModel: string;
        aiTitle: string | null;
        aiBullets: string[] | null;
        aiCategory: string | null;
    }
): Promise<EntryEnrichment> {
    // Get current version
    const existing = await db
        .select()
        .from(entryEnrichments)
        .where(eq(entryEnrichments.entryId, entryId))
        .orderBy(desc(entryEnrichments.version))
        .limit(1);

    const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;

    const created = await db
        .insert(entryEnrichments)
        .values({
            entryId,
            ...enrichment,
            version: nextVersion,
        })
        .returning();

    return created[0];
}

// Get entries in a date range for generation
export async function getEntriesInRange(
    userId: string,
    startDate: string,
    endDate: string
): Promise<EntryWithEnrichment[]> {
    const result = await db
        .select()
        .from(entries)
        .leftJoin(entryEnrichments, eq(entries.id, entryEnrichments.entryId))
        .where(
            and(
                eq(entries.userId, userId),
                isNull(entries.deletedAt),
                sql`${entries.entryDate} >= ${startDate}`,
                sql`${entries.entryDate} <= ${endDate}`
            )
        )
        .orderBy(desc(entries.entryDate));

    return result.map((row: JoinResult) => ({
        ...row.entries,
        enrichment: row.entry_enrichments,
    }));
}
