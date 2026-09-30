// Phase 4 — Drizzle schema for local Postgres (DB: uplift)
// Run: pnpm --filter @uplift/db migrate  (Drizzle Kit)
import { pgTable, text, timestamp, boolean, integer, jsonb, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  timezone: text('timezone').default('Africa/Lagos'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Better Auth tables (minimal — full tables created by Better Auth CLI/migrate)
export const profiles = pgTable('profiles', {
  userId: text('user_id').primaryKey(),
  moods: jsonb('moods').$type<string[]>().default([]),
  situations: jsonb('situations').$type<string[]>().default([]),
  goalsFocus: jsonb('goals_focus').$type<string[]>().default([]),
  styles: jsonb('styles').$type<string[]>().default([]),
  faithOptIn: boolean('faith_opt_in').default(false),
  notifyTimes: jsonb('notify_times').$type<string[]>().default(['08:00', '13:00', '20:00']),
  frequency: text('frequency').default('daily'),
});

export const uplifts = pgTable('uplifts', {
  id: text('id').primaryKey(),
  body: text('body').notNull(),
  greeting: text('greeting'),
  category: text('category').notNull(),
  moods: jsonb('moods').$type<string[]>(),
  situations: jsonb('situations').$type<string[]>(),
  styles: jsonb('styles').$type<string[]>(),
  faith: boolean('faith').default(false),
  scripture: text('scripture'),
  actionText: text('action_text'),
});

export const checkins = pgTable('checkins', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  mood: text('mood').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const goals = pgTable('goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  category: text('category'),
  why: text('why'),
  targetDate: text('target_date'),
  status: text('status').default('active'),
});

export const goalSteps = pgTable('goal_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  goalId: uuid('goal_id').notNull(),
  actionText: text('action_text').notNull(),
  doneAt: timestamp('done_at'),
});

export const saves = pgTable('saves', {
  userId: text('user_id').notNull(),
  upliftId: text('uplift_id').notNull(),
  collection: text('collection').default('favorites'),
});

export const likes = pgTable('likes', {
  userId: text('user_id').notNull(),
  upliftId: text('uplift_id').notNull(),
});

export const shares = pgTable('shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  upliftId: text('uplift_id').notNull(),
  channel: text('channel'),
  r2Key: text('r2_key'),
});

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  prompt: text('prompt'),
  body: text('body').notNull(),
  mood: text('mood'),
  gratitude: jsonb('gratitude').$type<string[]>(),
  victory: boolean('victory').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const streaks = pgTable('streaks', {
  userId: text('user_id').primaryKey(),
  currentCount: integer('current_count').default(0),
  longest: integer('longest').default(0),
  lastSeenDate: text('last_seen_date'),
});

export const entitlements = pgTable('entitlements', {
  userId: text('user_id').primaryKey(),
  tier: text('tier').default('free'),
  packs: jsonb('packs').$type<string[]>().default([]),
});

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  props: jsonb('props'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const files = pgTable('files', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  r2Key: text('r2_key').notNull(),
  purpose: text('purpose'),
  mime: text('mime'),
  createdAt: timestamp('created_at').defaultNow(),
});
