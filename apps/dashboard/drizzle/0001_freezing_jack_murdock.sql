CREATE TABLE `social_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`title` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`scheduled_at` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`format` text DEFAULT 'feed' NOT NULL,
	`channels` text DEFAULT '["instagram"]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
