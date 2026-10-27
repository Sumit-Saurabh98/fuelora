CREATE TABLE `fill_ups` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`filled_at` text NOT NULL,
	`local_date` text NOT NULL,
	`odometer_m` integer NOT NULL,
	`quantity_base` integer NOT NULL,
	`total_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`is_full` integer DEFAULT true NOT NULL,
	`missed_previous` integer DEFAULT false NOT NULL,
	`entry_mode` text NOT NULL,
	`station` text,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fill_ups_vehicle_odo` ON `fill_ups` (`vehicle_id`,`odometer_m`);--> statement-breakpoint
CREATE INDEX `fill_ups_vehicle_date` ON `fill_ups` (`vehicle_id`,`local_date`);--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`fuel_type` text NOT NULL,
	`make` text,
	`model` text,
	`year` integer,
	`plate` text,
	`initial_odometer_m` integer DEFAULT 0 NOT NULL,
	`tank_capacity_base` integer,
	`is_archived` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
