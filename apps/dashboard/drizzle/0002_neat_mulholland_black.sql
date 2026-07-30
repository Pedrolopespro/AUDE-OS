CREATE TABLE `instagram_connections` (
	`client_id` text PRIMARY KEY NOT NULL,
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
	`last_synced_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `meta_oauth_states` (
	`state` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
