CREATE TABLE "endpoint_jira_links" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"endpoint_id" varchar(255) NOT NULL,
	"issue_key" varchar(64) NOT NULL,
	"category" varchar(64) DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_date" bigint NOT NULL,
	"created_by" varchar(256),
	"updated_date" bigint,
	"updated_by" varchar(256),
	"deleted_date" bigint,
	"deleted_by" varchar(256)
);
--> statement-breakpoint
ALTER TABLE "endpoint_jira_links" ADD CONSTRAINT "endpoint_jira_links_endpoint_id_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_jira_links" ADD CONSTRAINT "endpoint_jira_links_created_by_account_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "endpoint_jira_links_endpoint_issue_idx" ON "endpoint_jira_links" USING btree ("endpoint_id","issue_key");