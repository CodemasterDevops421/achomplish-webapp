import { z } from "zod";

// Entry validation schemas
const entryDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional();

export const createEntrySchema = z.object({
    raw_text: z
        .string()
        .min(1, "Entry text is required")
        .max(5000, "Entry must be 5,000 characters or less"),
    entry_date: entryDateSchema,
});

export const createEntryLegacySchema = z.object({
    rawText: z
        .string()
        .min(1, "Entry text is required")
        .max(5000, "Entry must be 5,000 characters or less"),
    entryDate: entryDateSchema,
});

export const updateEntrySchema = z.object({
    raw_text: z
        .string()
        .min(1, "Entry text is required")
        .max(5000, "Entry must be 5,000 characters or less"),
});

export const updateEntryLegacySchema = z.object({
    rawText: z
        .string()
        .min(1, "Entry text is required")
        .max(5000, "Entry must be 5,000 characters or less"),
});

// AI enhancement request
export const enhanceEntrySchema = z.object({
    entry_id: z.string().uuid("Invalid entry ID"),
});

export const enhanceEntryLegacySchema = z.object({
    entryId: z.string().uuid("Invalid entry ID"),
});

// Generate review/resume request
export const generateOutputSchema = z.object({
    range_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date"),
    range_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date"),
});

export const generateOutputLegacySchema = z.object({
    rangeStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date"),
    rangeEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date"),
});

// User settings update
export const updateSettingsSchema = z.object({
    email_reminders_enabled: z.boolean().optional(),
    reminder_time: z
        .string()
        .regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)")
        .optional(),
    reminder_timezone: z.string().optional(),
    skip_weekends: z.boolean().optional(),
});

export const updateSettingsLegacySchema = z.object({
    emailRemindersEnabled: z.boolean().optional(),
    reminderTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)")
        .optional(),
    reminderTimezone: z.string().optional(),
    skipWeekends: z.boolean().optional(),
});

// Pagination params
export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const aiEnhancementResponseSchema = z.object({
    title: z.string().min(1).max(60),
    bullets: z.array(z.string().min(1)).min(2).max(3),
    category: z.string().min(1).max(50),
});

// Type exports
export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type EnhanceEntryInput = z.infer<typeof enhanceEntrySchema>;
export type GenerateOutputInput = z.infer<typeof generateOutputSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
