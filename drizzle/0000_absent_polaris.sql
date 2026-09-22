CREATE TABLE `batches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`profile` text NOT NULL,
	`requested` integer NOT NULL,
	`status` text NOT NULL,
	`active` integer,
	`started` text NOT NULL,
	`finished` text,
	`error` text,
	`raw` integer DEFAULT 0 NOT NULL,
	`imported` integer DEFAULT 0 NOT NULL,
	`commit_token` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_batch` ON `batches` (`user_id`,`active`);--> statement-breakpoint
CREATE INDEX `batches_owner_time` ON `batches` (`user_id`,`started`);--> statement-breakpoint
CREATE TABLE `history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_id` text NOT NULL,
	`previous` text NOT NULL,
	`status` text NOT NULL,
	`at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `history_owner_job_time` ON `history` (`user_id`,`job_id`,`at`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`data` text NOT NULL,
	`title` text NOT NULL,
	`company` text NOT NULL,
	`status` text NOT NULL,
	`score` real NOT NULL,
	`result` text NOT NULL,
	`published` text DEFAULT '' NOT NULL,
	`captured` text NOT NULL,
	`recommend_batch` text DEFAULT '' NOT NULL,
	`manual` integer DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`applied_at` text,
	`exclude_source` text DEFAULT '' NOT NULL,
	`exclude_reason` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`user_id`, `id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `jobs_owner_status_score` ON `jobs` (`user_id`,`status`,`score`);--> statement-breakpoint
CREATE INDEX `jobs_owner_batch` ON `jobs` (`user_id`,`recommend_batch`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text NOT NULL
);
