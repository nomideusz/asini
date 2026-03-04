CREATE TABLE `schedule_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`school_id` text NOT NULL,
	`schedule_type` text DEFAULT 'weekly' NOT NULL,
	`day_of_week` integer NOT NULL,
	`date` text,
	`start_time` text NOT NULL,
	`end_time` text,
	`duration` integer,
	`class_name` text NOT NULL,
	`class_description` text,
	`teacher` text,
	`level` text,
	`style` text,
	`location` text,
	`total_capacity` integer,
	`spots_left` integer,
	`waiting_list_capacity` integer,
	`is_cancelled` integer DEFAULT false,
	`is_free` integer DEFAULT false,
	`is_bookable_online` integer DEFAULT true,
	`source` text DEFAULT 'manual' NOT NULL,
	`external_id` text,
	`booking_url` text,
	`metadata` text,
	`last_seen_at` text DEFAULT (CURRENT_TIMESTAMP),
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `school_styles` (
	`school_id` text NOT NULL,
	`style_id` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`style_id`) REFERENCES `styles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `schools` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`website_url` text DEFAULT '',
	`phone` text,
	`email` text,
	`price` real,
	`trial_price` real,
	`single_class_price` real,
	`pricing_notes` text,
	`rating` real,
	`reviews` integer,
	`description_raw` text DEFAULT '',
	`description` text DEFAULT '',
	`editorial_summary` text DEFAULT '',
	`opening_hours` text DEFAULT '',
	`image_url` text DEFAULT '',
	`photo_reference` text DEFAULT '',
	`neighborhood` text DEFAULT '',
	`latitude` real,
	`longitude` real,
	`google_place_id` text DEFAULT '',
	`google_maps_url` text DEFAULT '',
	`schedule_url` text DEFAULT '',
	`schedule_source` text DEFAULT '',
	`schedule_mode` text DEFAULT 'auto',
	`last_schedule_crawl` text,
	`last_price_check` text,
	`last_updated` text DEFAULT (CURRENT_DATE),
	`source` text DEFAULT 'manual',
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `scrape_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`school_id` text NOT NULL,
	`task` text NOT NULL,
	`status` text NOT NULL,
	`message` text,
	`fields_updated` text,
	`duration_ms` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `styles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `styles_name_unique` ON `styles` (`name`);