CREATE TABLE "endpoints" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"project_id" varchar(255) NOT NULL,
	"path" text NOT NULL,
	"method" varchar(12) NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"description" text,
	"operation_id" text,
	"deprecated" boolean DEFAULT false NOT NULL,
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
CREATE TABLE "endpoint_request_examples" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"request_body_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"summary" text,
	"value" text NOT NULL,
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
CREATE TABLE "endpoint_response_examples" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"response_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"summary" text,
	"value" text NOT NULL,
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
CREATE TABLE "endpoint_parameters" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"endpoint_id" varchar(255) NOT NULL,
	"location" varchar(12) NOT NULL,
	"name" varchar(255) NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"description" text,
	"schema_type" varchar(32),
	"format" varchar(64),
	"example" jsonb,
	"enum_values" jsonb,
	"items" jsonb,
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
CREATE TABLE "endpoint_request_bodies" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"endpoint_id" varchar(255) NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"description" text,
	"content_type" varchar(100) DEFAULT 'application/json' NOT NULL,
	"mode" varchar(16),
	"schema_ref" varchar(255),
	"schema_data" jsonb,
	"raw_json" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_date" bigint NOT NULL,
	"created_by" varchar(256),
	"updated_date" bigint,
	"updated_by" varchar(256),
	"deleted_date" bigint,
	"deleted_by" varchar(256),
	CONSTRAINT "endpoint_request_bodies_endpoint_id_unique" UNIQUE("endpoint_id")
);
--> statement-breakpoint
CREATE TABLE "endpoint_responses" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"endpoint_id" varchar(255) NOT NULL,
	"status_code" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"content_type" varchar(100),
	"mode" varchar(16),
	"schema_ref" varchar(255),
	"schema_data" jsonb,
	"raw_json" text,
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
CREATE TABLE "endpoint_security_schemes" (
	"endpoint_id" varchar(255) NOT NULL,
	"security_scheme_id" varchar(255) NOT NULL,
	CONSTRAINT "endpoint_security_schemes_endpoint_id_security_scheme_id_pk" PRIMARY KEY("endpoint_id","security_scheme_id")
);
--> statement-breakpoint
CREATE TABLE "endpoint_tags" (
	"endpoint_id" varchar(255) NOT NULL,
	"tag_id" varchar(255) NOT NULL,
	CONSTRAINT "endpoint_tags_endpoint_id_tag_id_pk" PRIMARY KEY("endpoint_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "component_schemas" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"project_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_date" bigint NOT NULL,
	"created_by" varchar(256),
	"updated_date" bigint,
	"updated_by" varchar(256),
	"deleted_date" bigint,
	"deleted_by" varchar(256)
);
--> statement-breakpoint
CREATE TABLE "schema_properties" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"schema_id" varchar(255),
	"parent_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"type" varchar(32) NOT NULL,
	"format" varchar(64),
	"required" boolean DEFAULT false NOT NULL,
	"nullable" boolean DEFAULT false NOT NULL,
	"description" text,
	"example" jsonb,
	"default_value" jsonb,
	"enum_values" jsonb,
	"items" jsonb,
	"ref" varchar(255),
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
CREATE TABLE "environments" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"project_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"base_url" text DEFAULT '' NOT NULL,
	"variables" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT false NOT NULL,
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
CREATE TABLE "security_schemes" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"project_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(16) DEFAULT 'bearer' NOT NULL,
	"description" text,
	"scheme" varchar(32),
	"bearer_format" varchar(64),
	"location" varchar(12),
	"key_name" varchar(255),
	"flows" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_date" bigint NOT NULL,
	"created_by" varchar(256),
	"updated_date" bigint,
	"updated_by" varchar(256),
	"deleted_date" bigint,
	"deleted_by" varchar(256)
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"project_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_date" bigint NOT NULL,
	"created_by" varchar(256),
	"updated_date" bigint,
	"updated_by" varchar(256),
	"deleted_date" bigint,
	"deleted_by" varchar(256)
);
--> statement-breakpoint
ALTER TABLE "endpoints" ADD CONSTRAINT "endpoints_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_request_examples" ADD CONSTRAINT "endpoint_request_examples_request_body_id_endpoint_request_bodies_id_fk" FOREIGN KEY ("request_body_id") REFERENCES "public"."endpoint_request_bodies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_response_examples" ADD CONSTRAINT "endpoint_response_examples_response_id_endpoint_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."endpoint_responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_parameters" ADD CONSTRAINT "endpoint_parameters_endpoint_id_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_request_bodies" ADD CONSTRAINT "endpoint_request_bodies_endpoint_id_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_request_bodies" ADD CONSTRAINT "endpoint_request_bodies_schema_ref_component_schemas_id_fk" FOREIGN KEY ("schema_ref") REFERENCES "public"."component_schemas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_responses" ADD CONSTRAINT "endpoint_responses_endpoint_id_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_responses" ADD CONSTRAINT "endpoint_responses_schema_ref_component_schemas_id_fk" FOREIGN KEY ("schema_ref") REFERENCES "public"."component_schemas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_security_schemes" ADD CONSTRAINT "endpoint_security_schemes_endpoint_id_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_security_schemes" ADD CONSTRAINT "endpoint_security_schemes_security_scheme_id_security_schemes_id_fk" FOREIGN KEY ("security_scheme_id") REFERENCES "public"."security_schemes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_tags" ADD CONSTRAINT "endpoint_tags_endpoint_id_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoint_tags" ADD CONSTRAINT "endpoint_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_schemas" ADD CONSTRAINT "component_schemas_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_properties" ADD CONSTRAINT "schema_properties_schema_id_component_schemas_id_fk" FOREIGN KEY ("schema_id") REFERENCES "public"."component_schemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_properties" ADD CONSTRAINT "schema_properties_parent_id_schema_properties_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."schema_properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environments" ADD CONSTRAINT "environments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_schemes" ADD CONSTRAINT "security_schemes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;