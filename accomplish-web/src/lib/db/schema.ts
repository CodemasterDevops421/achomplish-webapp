import { pgTable, uuid, text, date, timestamp, jsonb, integer, boolean, time, unique, index } from 'drizzle-orm/pg-core';

// Entries table - stores daily accomplishments
export const entries = pgTable('entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  entryDate: date('entry_date').notNull(),
  rawText: text('raw_text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  // One entry per user per day
  uniqueUserDate: unique().on(table.userId, table.entryDate),
  userDateIdx: index('entries_user_date_idx').on(table.userId, table.entryDate),
  userDeletedIdx: index('entries_user_deleted_idx').on(table.userId, table.deletedAt),
}));

// Entry enrichments - AI-enhanced versions of entries
export const entryEnrichments = pgTable('entry_enrichments', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').references(() => entries.id, { onDelete: 'cascade' }).notNull(),
  aiProvider: text('ai_provider').notNull(),
  aiModel: text('ai_model').notNull(),
  aiTitle: text('ai_title'),
  aiBullets: jsonb('ai_bullets').$type<string[]>(),
  aiCategory: text('ai_category'),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  entryVersionIdx: index('entry_enrichments_entry_version_idx').on(table.entryId, table.version),
}));

// Generated outputs - performance reviews and resume bullets
export const generatedOutputs = pgTable('generated_outputs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(), // 'review' | 'resume'
  rangeStart: date('range_start').notNull(),
  rangeEnd: date('range_end').notNull(),
  outputMarkdown: text('output_markdown').notNull(),
  inputSnapshot: jsonb('input_snapshot'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userTypeRangeIdx: index('generated_outputs_user_type_range_idx').on(table.userId, table.type, table.rangeStart, table.rangeEnd),
}));

// User settings - preferences for reminders, etc.
export const userSettings = pgTable('user_settings', {
  userId: text('user_id').primaryKey(),
  emailRemindersEnabled: boolean('email_reminders_enabled').default(true).notNull(),
  reminderTime: time('reminder_time').default('18:30').notNull(),
  reminderTimezone: text('reminder_timezone').default('UTC').notNull(),
  skipWeekends: boolean('skip_weekends').default(true).notNull(),
  lastReminderSentAt: timestamp('last_reminder_sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Rate limit table for API endpoints
export const rateLimits = pgTable('rate_limits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  key: text('key').notNull(),
  windowStart: timestamp('window_start').notNull(),
  count: integer('count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userKeyWindowIdx: unique('rate_limits_user_key_window_idx').on(table.userId, table.key, table.windowStart),
  userKeyIdx: index('rate_limits_user_key_idx').on(table.userId, table.key),
}));

// Type exports for use in the application
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
export type EntryEnrichment = typeof entryEnrichments.$inferSelect;
export type NewEntryEnrichment = typeof entryEnrichments.$inferInsert;
export type GeneratedOutput = typeof generatedOutputs.$inferSelect;
export type NewGeneratedOutput = typeof generatedOutputs.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;
