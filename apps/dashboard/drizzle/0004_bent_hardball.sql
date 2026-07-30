CREATE TABLE `agency_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ppc_google_ads_accounts` (
	`client_id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`account_name` text,
	`status` text DEFAULT 'pending_link' NOT NULL,
	`currency_code` text,
	`time_zone` text,
	`linked_at` text,
	`last_synced_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ppc_google_ads_customer_id_unique` ON `ppc_google_ads_accounts` (`customer_id`);