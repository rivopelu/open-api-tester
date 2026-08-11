ALTER TABLE "account" ADD COLUMN "environments" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "active_environment_id" varchar(255);