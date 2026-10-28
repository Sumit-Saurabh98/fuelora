CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text,
	`kind` text NOT NULL,
	`type_key` text NOT NULL,
	`title` text,
	`due_date` text,
	`due_odometer_m` integer,
	`repeat_months` integer,
	`repeat_distance_m` integer,
	`lead_days` integer DEFAULT 7 NOT NULL,
	`lead_distance_m` integer DEFAULT 300000 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_done_date` text,
	`last_done_odometer_m` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "reminders_due" CHECK("reminders"."due_date" is not null or "reminders"."due_odometer_m" is not null)
);
--> statement-breakpoint
CREATE INDEX `reminders_vehicle_status` ON `reminders` (`vehicle_id`,`status`);