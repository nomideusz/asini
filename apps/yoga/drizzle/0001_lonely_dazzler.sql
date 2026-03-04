CREATE TABLE `claim_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`school_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`role` text NOT NULL,
	`message` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `schools` ADD `pricing_json` text;--> statement-breakpoint
ALTER TABLE `schools` ADD `pricing_url` text DEFAULT '';