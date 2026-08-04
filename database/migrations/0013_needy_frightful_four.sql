CREATE TABLE "customer_favorite_companies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_favorite_companies" ADD CONSTRAINT "customer_favorite_companies_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_favorite_companies" ADD CONSTRAINT "customer_favorite_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_favorite_companies_customer_company_unique" ON "customer_favorite_companies" USING btree ("customer_id","company_id");--> statement-breakpoint
CREATE INDEX "customer_favorite_companies_customer_idx" ON "customer_favorite_companies" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_favorite_companies_company_idx" ON "customer_favorite_companies" USING btree ("company_id");