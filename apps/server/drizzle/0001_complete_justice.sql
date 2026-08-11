ALTER TABLE "account" ADD COLUMN "mcp_token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_mcp_token_hash_unique" UNIQUE("mcp_token_hash");