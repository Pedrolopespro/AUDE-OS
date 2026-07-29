CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`initials` text NOT NULL,
	`services` text DEFAULT '[]' NOT NULL,
	`contract_type` text NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`payment_status` text DEFAULT 'confirm' NOT NULL,
	`color` text DEFAULT '#4866ed' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY NOT NULL,
	`prospecting` integer,
	`meetings` integer,
	`closed_clients` integer,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`contact` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`stage` text DEFAULT 'prospect' NOT NULL,
	`meeting_status` text,
	`meeting_date` text,
	`estimated_value` integer,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
