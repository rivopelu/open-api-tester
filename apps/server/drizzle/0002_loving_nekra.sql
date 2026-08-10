ALTER TABLE "projects" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "version" varchar(64) DEFAULT '1.0.0';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "openapi_version" varchar(16) DEFAULT 'openapi3';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "global_security" jsonb DEFAULT '[]'::jsonb;