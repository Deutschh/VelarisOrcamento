CREATE TABLE "company_public_profiles" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"niche_code" text DEFAULT 'cleaning_upholstery' NOT NULL,
	"headline" text,
	"description" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"neighborhood" text,
	"address_line" text,
	"address_complement" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"service_radius_km" numeric(8, 2),
	"service_cities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"service_neighborhoods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"logo_url" text,
	"cover_image_url" text,
	"primary_color" text,
	"contact_phone" text,
	"contact_whatsapp" text,
	"contact_email" text,
	"website_url" text,
	"instagram_url" text,
	"terms" text,
	"gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"review_average" numeric(3, 2),
	"review_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_public_profiles" ADD CONSTRAINT "company_public_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "company_public_profiles" ("company_id", "niche_code")
SELECT "id", 'cleaning_upholstery'
FROM "companies"
ON CONFLICT ("company_id") DO NOTHING;--> statement-breakpoint
CREATE INDEX "company_public_profiles_niche_idx" ON "company_public_profiles" USING btree ("niche_code");--> statement-breakpoint
CREATE INDEX "company_public_profiles_city_idx" ON "company_public_profiles" USING btree ("city");
