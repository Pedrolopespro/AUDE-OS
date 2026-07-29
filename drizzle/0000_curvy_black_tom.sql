CREATE TABLE `instagram_connections` (
	`client_id` text PRIMARY KEY NOT NULL,
	`client_name` text NOT NULL,
	`instagram_user_id` text NOT NULL,
	`username` text NOT NULL,
	`account_name` text,
	`account_type` text,
	`profile_picture_url` text,
	`access_token_encrypted` text NOT NULL,
	`token_expires_at` text,
	`followers_count` integer DEFAULT 0 NOT NULL,
	`media_count` integer DEFAULT 0 NOT NULL,
	`connected_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`client_id` text NOT NULL,
	`client_name` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`connected_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_token_hash_unique` ON `invitations` (`token_hash`);--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`state` text PRIMARY KEY NOT NULL,
	`invitation_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`invitation_id`) REFERENCES `invitations`(`id`) ON UPDATE no action ON DELETE cascade
);
