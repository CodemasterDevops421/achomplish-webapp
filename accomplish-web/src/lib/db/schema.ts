import { pgTable, uuid, text, date, timestamp, jsonb, integer, boolean, time, unique } from 'drizzle-orm/pg-core';

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
});

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
});

// User settings - preferences for reminders, etc.
export const userSettings = pgTable('user_settings', {
  userId: text('user_id').primaryKey(),
  emailRemindersEnabled: boolean('email_reminders_enabled').default(true).notNull(),
  reminderTime: time('reminder_time').default('18:30').notNull(),
  reminderTimezone: text('reminder_timezone').default('UTC').notNull(),
  skipWeekends: boolean('skip_weekends').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports for use in the application
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
export type EntryEnrichment = typeof entryEnrichments.$inferSelect;
export type NewEntryEnrichment = typeof entryEnrichments.$inferInsert;
export type GeneratedOutput = typeof generatedOutputs.$inferSelect;
export type NewGeneratedOutput = typeof generatedOutputs.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
