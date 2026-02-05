import { z } from "zod";

// Entry validation schemas
export const createEntrySchema = z.object({
    rawText: z
        .string()
        .min(1, "Entry text is required")
        .max(5000, "Entry must be 5,000 characters or less"),
    entryDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
        .optional(), // Defaults to today
});

export const updateEntrySchema = z.object({
    rawText: z
        .string()
        .min(1, "Entry text is required")
        .max(5000, "Entry must be 5,000 characters or less"),
});

// AI enhancement request
export const enhanceEntrySchema = z.object({
    entryId: z.string().uuid("Invalid entry ID"),
});

// Generate review/resume request
export const generateOutputSchema = z.object({
    type: z.enum(["review", "resume"]),
    rangeStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date"),
    rangeEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date"),
});

// User settings update
export const updateSettingsSchema = z.object({
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

// Type exports
export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type EnhanceEntryInput = z.infer<typeof enhanceEntrySchema>;
export type GenerateOutputInput = z.infer<typeof generateOutputSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
