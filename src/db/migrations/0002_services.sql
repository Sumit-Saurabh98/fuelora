CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`serviced_date` text NOT NULL,
	`odometer_m` integer,
	`type_key` text NOT NULL,
	`title` text,
	`cost_minor` integer,
	`currency` text,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `services_vehicle_date` ON `services` (`vehicle_id`,`serviced_date`);