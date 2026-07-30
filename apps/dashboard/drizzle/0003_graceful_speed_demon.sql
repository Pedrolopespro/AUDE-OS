CREATE TABLE `access_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`client_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` text NOT NULL,
	`invited_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`accepted_at` text,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_invitations_token_hash_unique` ON `access_invitations` (`token_hash`);--> statement-breakpoint
CREATE TABLE `app_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'client' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_users_email_unique` ON `app_users` (`email`);--> statement-breakpoint
CREATE TABLE `client_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_memberships_user_client_unique` ON `client_memberships` (`user_id`,`client_id`);