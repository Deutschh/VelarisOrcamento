CREATE TYPE "public"."appointment_status" AS ENUM('none', 'proposed', 'confirmed', 'reschedule_requested', 'rescheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "appointment_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"appointment_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"actor_type" text DEFAULT 'company' NOT NULL,
	"event_type" text NOT NULL,
	"from_status" "appointment_status",
	"to_status" "appointment_status",
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"quote_id" uuid NOT NULL,
	"quote_version_id" uuid NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"status" "appointment_status" DEFAULT 'proposed' NOT NULL,
	"scheduling_mode" "scheduling_mode" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"duration_minutes" integer NOT NULL,
	"timezone" text NOT NULL,
	"address" text,
	"address_snapshot" jsonb,
	"notes" text,
	"conflict_warning" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"proposed_by_user_id" uuid,
	"confirmed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointment_history" ADD CONSTRAINT "appointment_history_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_history" ADD CONSTRAINT "appointment_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_quote_version_id_quote_versions_id_fk" FOREIGN KEY ("quote_version_id") REFERENCES "public"."quote_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_proposed_by_user_id_users_id_fk" FOREIGN KEY ("proposed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_history_appointment_idx" ON "appointment_history" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "appointments_quote_idx" ON "appointments" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "appointments_request_idx" ON "appointments" USING btree ("quote_request_id");--> statement-breakpoint
CREATE INDEX "appointments_company_time_idx" ON "appointments" USING btree ("company_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_company_status_idx" ON "appointments" USING btree ("company_id","status");