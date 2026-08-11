CREATE TABLE "endpoint_folders" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"project_id" varchar(255) NOT NULL,
	"parent_id" varchar(255),
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_date" bigint NOT NULL,
	"created_by" varchar(256),
	"updated_date" bigint,
	"updated_by" varchar(256),
	"deleted_date" bigint,
	"deleted_by" varchar(256)
);
--> statement-breakpoint
ALTER TABLE "endpoints" ADD COLUMN "folder_id" varchar(255);--> statement-breakpoint
ALTER TABLE "endpoint_folders" ADD CONSTRAINT "endpoint_folders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_folders" ADD CONSTRAINT "endpoint_folders_parent_id_endpoint_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."endpoint_folders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_folders" ADD CONSTRAINT "endpoint_folders_created_by_account_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoints" ADD CONSTRAINT "endpoints_folder_id_endpoint_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."endpoint_folders"("id") ON DELETE set null ON UPDATE no action;