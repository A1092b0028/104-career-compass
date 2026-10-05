CREATE TABLE `ai_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_key` text NOT NULL,
	`started` integer NOT NULL,
	`expires` integer NOT NULL,
	`released` integer
);
--> statement-breakpoint
CREATE INDEX `ai_requests_user_started` ON `ai_requests` (`user_key`,`started`);--> statement-breakpoint
CREATE INDEX `ai_requests_started` ON `ai_requests` (`started`);--> statement-breakpoint
CREATE INDEX `ai_requests_active` ON `ai_requests` (`released`,`expires`);--> statement-breakpoint
CREATE TABLE `maintenance` (
	`key` text PRIMARY KEY NOT NULL,
	`completed` text NOT NULL
);
