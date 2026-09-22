import { sqliteTable, text, integer, real, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const users = sqliteTable('users', { id: text('id').primaryKey(), created: text('created').notNull() });
export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }), data: text('data').notNull(), updated: text('updated').notNull(),
});
export const batches = sqliteTable('batches', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  profile: text('profile').notNull(), requested: integer('requested').notNull(), status: text('status').notNull(), active: integer('active'), started: text('started').notNull(),
  finished: text('finished'), error: text('error'), raw: integer('raw').notNull().default(0), imported: integer('imported').notNull().default(0), commitToken: text('commit_token'),
}, t => [uniqueIndex('one_active_batch').on(t.userId, t.active), index('batches_owner_time').on(t.userId, t.started)]);
export const jobs = sqliteTable('jobs', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), id: text('id').notNull(), data: text('data').notNull(), title: text('title').notNull(), company: text('company').notNull(),
  status: text('status').notNull(), score: real('score').notNull(), result: text('result').notNull(), published: text('published').notNull().default(''), captured: text('captured').notNull(),
  recommendBatch: text('recommend_batch').notNull().default(''), manual: integer('manual').notNull().default(0), note: text('note').notNull().default(''), appliedAt: text('applied_at'),
  excludeSource: text('exclude_source').notNull().default(''), excludeReason: text('exclude_reason').notNull().default(''),
}, t => [primaryKey({ columns: [t.userId, t.id] }), index('jobs_owner_status_score').on(t.userId, t.status, t.score), index('jobs_owner_batch').on(t.userId, t.recommendBatch)]);
export const history = sqliteTable('history', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), jobId: text('job_id').notNull(), previous: text('previous').notNull(), status: text('status').notNull(), at: text('at').notNull(),
}, t => [index('history_owner_job_time').on(t.userId, t.jobId, t.at)]);
