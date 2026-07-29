CREATE TYPE "public"."quote_request_status" AS ENUM('draft', 'submitted');--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"response_body" jsonb NOT NULL,
	"status_code" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_access_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_request_answers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"item_id" text,
	"field_code" text NOT NULL,
	"value" jsonb NOT NULL,
	"original_value" text,
	"original_unit" text,
	"normalized_value" numeric(12, 4),
	"normalized_unit" "pricing_rule_unit",
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_request_calculations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"calculation_snapshot" jsonb NOT NULL,
	"internal_total" numeric(12, 2) NOT NULL,
	"estimate_min" numeric(12, 2) NOT NULL,
	"estimate_max" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_request_files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"item_id" text,
	"field_code" text,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_provider" text DEFAULT 'stub' NOT NULL,
	"storage_key" text,
	"status" text DEFAULT 'metadata_received' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"request_code" text,
	"company_id" uuid NOT NULL,
	"company_configuration_id" uuid NOT NULL,
	"company_service_id" uuid NOT NULL,
	"company_pricing_version_id" uuid,
	"customer_id" uuid,
	"status" "quote_request_status" DEFAULT 'draft' NOT NULL,
	"draft_token_hash" text,
	"public_token_id" uuid,
	"request_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"configuration_snapshot" jsonb,
	"legal_snapshot" jsonb,
	"calculation_snapshot" jsonb,
	"internal_total" numeric(12, 2),
	"estimate_min" numeric(12, 2),
	"estimate_max" numeric(12, 2),
	"submitted_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_request_answers" ADD CONSTRAINT "quote_request_answers_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_request_calculations" ADD CONSTRAINT "quote_request_calculations_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_request_files" ADD CONSTRAINT "quote_request_files_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_company_configuration_id_company_configurations_id_fk" FOREIGN KEY ("company_configuration_id") REFERENCES "public"."company_configurations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_company_service_id_company_services_id_fk" FOREIGN KEY ("company_service_id") REFERENCES "public"."company_services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_company_pricing_version_id_company_pricing_versions_id_fk" FOREIGN KEY ("company_pricing_version_id") REFERENCES "public"."company_pricing_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_public_token_id_public_access_tokens_id_fk" FOREIGN KEY ("public_token_id") REFERENCES "public"."public_access_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_scope_key_unique" ON "idempotency_keys" USING btree ("scope","key");--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "public_access_tokens_token_hash_unique" ON "public_access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "public_access_tokens_entity_idx" ON "public_access_tokens" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_request_answers_request_field_unique" ON "quote_request_answers" USING btree ("quote_request_id","item_id","field_code");--> statement-breakpoint
CREATE INDEX "quote_request_answers_request_idx" ON "quote_request_answers" USING btree ("quote_request_id");--> statement-breakpoint
CREATE INDEX "quote_request_calculations_request_idx" ON "quote_request_calculations" USING btree ("quote_request_id");--> statement-breakpoint
CREATE INDEX "quote_request_files_request_idx" ON "quote_request_files" USING btree ("quote_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_requests_request_code_unique" ON "quote_requests" USING btree ("request_code");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_requests_draft_token_hash_unique" ON "quote_requests" USING btree ("draft_token_hash");--> statement-breakpoint
CREATE INDEX "quote_requests_company_status_idx" ON "quote_requests" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "quote_requests_expires_at_idx" ON "quote_requests" USING btree ("expires_at");