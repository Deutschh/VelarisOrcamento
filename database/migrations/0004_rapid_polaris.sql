CREATE TYPE "public"."pricing_rule_type" AS ENUM('fixed_price', 'quantity', 'area', 'linear_meter', 'multiplier', 'fixed_addition', 'percentage_addition', 'minimum_value', 'minimum_area', 'price_range', 'option_price', 'distance_fee', 'administrative_discount', 'rounding');--> statement-breakpoint
CREATE TYPE "public"."pricing_rule_unit" AS ENUM('unit', 'm', 'm2', 'linear_m', 'km');--> statement-breakpoint
CREATE TYPE "public"."rounding_mode" AS ENUM('nearest', 'up', 'down');--> statement-breakpoint
CREATE TABLE "company_pricing_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_pricing_version_id" uuid NOT NULL,
	"company_service_id" uuid NOT NULL,
	"template_pricing_rule_id" uuid,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"rule_type" "pricing_rule_type" NOT NULL,
	"target_field_code" text,
	"target_option_code" text,
	"quantity_field_code" text,
	"amount" numeric(12, 2),
	"percentage_bps" integer,
	"multiplier_bps" integer,
	"minimum_value" numeric(12, 4),
	"maximum_value" numeric(12, 4),
	"unit" "pricing_rule_unit",
	"condition" jsonb,
	"rounding_mode" "rounding_mode",
	"rounding_increment_cents" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_pricing_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_configuration_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"status" "company_configuration_status" DEFAULT 'draft' NOT NULL,
	"version" integer NOT NULL,
	"pricing_snapshot" jsonb,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_pricing_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"template_service_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"rule_type" "pricing_rule_type" NOT NULL,
	"target_field_code" text,
	"target_option_code" text,
	"quantity_field_code" text,
	"amount" numeric(12, 2),
	"percentage_bps" integer,
	"multiplier_bps" integer,
	"minimum_value" numeric(12, 4),
	"maximum_value" numeric(12, 4),
	"unit" "pricing_rule_unit",
	"condition" jsonb,
	"rounding_mode" "rounding_mode",
	"rounding_increment_cents" integer,
	"is_active_default" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_pricing_rules" ADD CONSTRAINT "company_pricing_rules_company_pricing_version_id_company_pricing_versions_id_fk" FOREIGN KEY ("company_pricing_version_id") REFERENCES "public"."company_pricing_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_pricing_rules" ADD CONSTRAINT "company_pricing_rules_company_service_id_company_services_id_fk" FOREIGN KEY ("company_service_id") REFERENCES "public"."company_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_pricing_rules" ADD CONSTRAINT "company_pricing_rules_template_pricing_rule_id_template_pricing_rules_id_fk" FOREIGN KEY ("template_pricing_rule_id") REFERENCES "public"."template_pricing_rules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_pricing_versions" ADD CONSTRAINT "company_pricing_versions_company_configuration_id_company_configurations_id_fk" FOREIGN KEY ("company_configuration_id") REFERENCES "public"."company_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_pricing_versions" ADD CONSTRAINT "company_pricing_versions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_pricing_versions" ADD CONSTRAINT "company_pricing_versions_template_id_niche_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."niche_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_pricing_versions" ADD CONSTRAINT "company_pricing_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_pricing_versions" ADD CONSTRAINT "company_pricing_versions_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_pricing_rules" ADD CONSTRAINT "template_pricing_rules_template_service_id_template_services_id_fk" FOREIGN KEY ("template_service_id") REFERENCES "public"."template_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_pricing_rules_version_service_code_unique" ON "company_pricing_rules" USING btree ("company_pricing_version_id","company_service_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "company_pricing_versions_configuration_unique" ON "company_pricing_versions" USING btree ("company_configuration_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_pricing_versions_company_template_version_unique" ON "company_pricing_versions" USING btree ("company_id","template_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "template_pricing_rules_service_code_unique" ON "template_pricing_rules" USING btree ("template_service_id","code");--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
INSERT INTO "template_pricing_rules" (
	"id",
	"template_service_id",
	"code",
	"label",
	"rule_type",
	"target_field_code",
	"target_option_code",
	"quantity_field_code",
	"amount",
	"percentage_bps",
	"multiplier_bps",
	"minimum_value",
	"maximum_value",
	"unit",
	"condition",
	"rounding_mode",
	"rounding_increment_cents",
	"is_active_default",
	"display_order"
) VALUES
	('10000000-0000-4000-8000-000000020001', '10000000-0000-4000-8000-000000000101', 'item_sofa_base', 'Preco-base sofa', 'option_price', 'item_type', 'sofa', 'quantity', 120.00, NULL, NULL, NULL, NULL, 'unit', NULL, NULL, NULL, true, 10),
	('10000000-0000-4000-8000-000000020002', '10000000-0000-4000-8000-000000000101', 'item_armchair_base', 'Preco-base poltrona', 'option_price', 'item_type', 'armchair', 'quantity', 70.00, NULL, NULL, NULL, NULL, 'unit', NULL, NULL, NULL, true, 11),
	('10000000-0000-4000-8000-000000020003', '10000000-0000-4000-8000-000000000101', 'item_chair_base', 'Preco-base cadeira', 'option_price', 'item_type', 'chair', 'quantity', 35.00, NULL, NULL, NULL, NULL, 'unit', NULL, NULL, NULL, true, 12),
	('10000000-0000-4000-8000-000000020004', '10000000-0000-4000-8000-000000000101', 'item_mattress_base', 'Preco-base colchao', 'option_price', 'item_type', 'mattress', 'quantity', 100.00, NULL, NULL, NULL, NULL, 'unit', NULL, NULL, NULL, true, 13),
	('10000000-0000-4000-8000-000000020005', '10000000-0000-4000-8000-000000000101', 'item_headboard_base', 'Preco-base cabeceira', 'option_price', 'item_type', 'headboard', 'quantity', 90.00, NULL, NULL, NULL, NULL, 'unit', NULL, NULL, NULL, true, 14),
	('10000000-0000-4000-8000-000000020006', '10000000-0000-4000-8000-000000000101', 'item_puff_base', 'Preco-base puff', 'option_price', 'item_type', 'puff', 'quantity', 55.00, NULL, NULL, NULL, NULL, 'unit', NULL, NULL, NULL, true, 15),
	('10000000-0000-4000-8000-000000020007', '10000000-0000-4000-8000-000000000101', 'item_car_seat_base', 'Preco-base banco automotivo', 'option_price', 'item_type', 'car_seat', 'quantity', 80.00, NULL, NULL, NULL, NULL, 'unit', NULL, NULL, NULL, true, 16),
	('10000000-0000-4000-8000-000000020008', '10000000-0000-4000-8000-000000000101', 'item_rug_base', 'Preco-base tapete', 'option_price', 'item_type', 'rug', 'quantity', 90.00, NULL, NULL, NULL, NULL, 'unit', NULL, NULL, NULL, true, 17),
	('10000000-0000-4000-8000-000000020009', '10000000-0000-4000-8000-000000000101', 'item_carpet_base', 'Preco-base carpete', 'option_price', 'item_type', 'carpet', 'quantity', 110.00, NULL, NULL, NULL, NULL, 'unit', NULL, NULL, NULL, true, 18),
	('10000000-0000-4000-8000-000000020010', '10000000-0000-4000-8000-000000000101', 'item_other_base', 'Preco-base outro item', 'option_price', 'item_type', 'other', 'quantity', 80.00, NULL, NULL, NULL, NULL, 'unit', NULL, NULL, NULL, true, 19),
	('10000000-0000-4000-8000-000000020011', '10000000-0000-4000-8000-000000000101', 'sofa_seats_addition', 'Adicional por lugar de sofa', 'quantity', 'seats', NULL, NULL, 25.00, NULL, NULL, NULL, NULL, 'unit', '{"sourceFieldCode":"item_type","operator":"equals","value":"sofa"}'::jsonb, NULL, NULL, true, 30),
	('10000000-0000-4000-8000-000000020012', '10000000-0000-4000-8000-000000000101', 'size_medium_multiplier', 'Multiplicador tamanho medio', 'multiplier', NULL, NULL, NULL, NULL, NULL, 11000, NULL, NULL, NULL, '{"sourceFieldCode":"size","operator":"equals","value":"medium"}'::jsonb, NULL, NULL, true, 40),
	('10000000-0000-4000-8000-000000020013', '10000000-0000-4000-8000-000000000101', 'size_large_multiplier', 'Multiplicador tamanho grande', 'multiplier', NULL, NULL, NULL, NULL, NULL, 12000, NULL, NULL, NULL, '{"sourceFieldCode":"size","operator":"equals","value":"large"}'::jsonb, NULL, NULL, true, 41),
	('10000000-0000-4000-8000-000000020014', '10000000-0000-4000-8000-000000000101', 'dirt_medium_multiplier', 'Multiplicador sujeira media', 'multiplier', NULL, NULL, NULL, NULL, NULL, 11500, NULL, NULL, NULL, '{"sourceFieldCode":"dirt_level","operator":"equals","value":"medium"}'::jsonb, NULL, NULL, true, 50),
	('10000000-0000-4000-8000-000000020015', '10000000-0000-4000-8000-000000000101', 'dirt_heavy_multiplier', 'Multiplicador sujeira intensa', 'multiplier', NULL, NULL, NULL, NULL, NULL, 13000, NULL, NULL, NULL, '{"sourceFieldCode":"dirt_level","operator":"equals","value":"heavy"}'::jsonb, NULL, NULL, true, 51),
	('10000000-0000-4000-8000-000000020016', '10000000-0000-4000-8000-000000000101', 'stains_addition', 'Adicional por manchas', 'fixed_addition', NULL, NULL, NULL, 30.00, NULL, NULL, NULL, NULL, NULL, '{"sourceFieldCode":"has_stains","operator":"equals","value":true}'::jsonb, NULL, NULL, true, 60),
	('10000000-0000-4000-8000-000000020017', '10000000-0000-4000-8000-000000000101', 'odor_addition', 'Adicional por odor', 'fixed_addition', NULL, NULL, NULL, 25.00, NULL, NULL, NULL, NULL, NULL, '{"sourceFieldCode":"odor","operator":"equals","value":true}'::jsonb, NULL, NULL, true, 70),
	('10000000-0000-4000-8000-000000020018', '10000000-0000-4000-8000-000000000101', 'pet_hair_addition', 'Adicional por pelos', 'fixed_addition', NULL, NULL, NULL, 20.00, NULL, NULL, NULL, NULL, NULL, '{"sourceFieldCode":"pet_hair","operator":"equals","value":true}'::jsonb, NULL, NULL, true, 80),
	('10000000-0000-4000-8000-000000020019', '10000000-0000-4000-8000-000000000101', 'waterproofing_addition', 'Adicional por impermeabilizacao', 'fixed_addition', NULL, NULL, NULL, 80.00, NULL, NULL, NULL, NULL, NULL, '{"sourceFieldCode":"waterproofing","operator":"equals","value":true}'::jsonb, NULL, NULL, true, 90),
	('10000000-0000-4000-8000-000000020020', '10000000-0000-4000-8000-000000000101', 'urgency_addition', 'Adicional por urgencia', 'fixed_addition', NULL, NULL, NULL, 40.00, NULL, NULL, NULL, NULL, NULL, '{"sourceFieldCode":"urgency","operator":"equals","value":"urgent"}'::jsonb, NULL, NULL, true, 100),
	('10000000-0000-4000-8000-000000020021', '10000000-0000-4000-8000-000000000101', 'minimum_visit', 'Valor minimo de visita', 'minimum_value', NULL, NULL, NULL, 120.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 900),
	('10000000-0000-4000-8000-000000020022', '10000000-0000-4000-8000-000000000101', 'rounding_nearest_5', 'Arredondamento para R$ 5', 'rounding', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'nearest', 500, true, 990)
ON CONFLICT ("template_service_id","code") DO NOTHING;--> statement-breakpoint
INSERT INTO "company_pricing_versions" (
	"id",
	"company_configuration_id",
	"company_id",
	"template_id",
	"status",
	"version",
	"created_by_user_id",
	"updated_by_user_id",
	"published_at"
)
SELECT
	gen_random_uuid(),
	"company_configurations"."id",
	"company_configurations"."company_id",
	"company_configurations"."template_id",
	"company_configurations"."status",
	"company_configurations"."version",
	"company_configurations"."created_by_user_id",
	"company_configurations"."updated_by_user_id",
	"company_configurations"."published_at"
FROM "company_configurations"
INNER JOIN "niche_templates"
	ON "niche_templates"."id" = "company_configurations"."template_id"
WHERE "niche_templates"."code" = 'cleaning_upholstery'
ON CONFLICT ("company_configuration_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "company_pricing_rules" (
	"id",
	"company_pricing_version_id",
	"company_service_id",
	"template_pricing_rule_id",
	"code",
	"label",
	"rule_type",
	"target_field_code",
	"target_option_code",
	"quantity_field_code",
	"amount",
	"percentage_bps",
	"multiplier_bps",
	"minimum_value",
	"maximum_value",
	"unit",
	"condition",
	"rounding_mode",
	"rounding_increment_cents",
	"is_active",
	"display_order"
)
SELECT
	gen_random_uuid(),
	"company_pricing_versions"."id",
	"company_services"."id",
	"template_pricing_rules"."id",
	"template_pricing_rules"."code",
	"template_pricing_rules"."label",
	"template_pricing_rules"."rule_type",
	"template_pricing_rules"."target_field_code",
	"template_pricing_rules"."target_option_code",
	"template_pricing_rules"."quantity_field_code",
	"template_pricing_rules"."amount",
	"template_pricing_rules"."percentage_bps",
	"template_pricing_rules"."multiplier_bps",
	"template_pricing_rules"."minimum_value",
	"template_pricing_rules"."maximum_value",
	"template_pricing_rules"."unit",
	"template_pricing_rules"."condition",
	"template_pricing_rules"."rounding_mode",
	"template_pricing_rules"."rounding_increment_cents",
	"template_pricing_rules"."is_active_default",
	"template_pricing_rules"."display_order"
FROM "company_pricing_versions"
INNER JOIN "company_services"
	ON "company_services"."company_configuration_id" = "company_pricing_versions"."company_configuration_id"
INNER JOIN "template_pricing_rules"
	ON "template_pricing_rules"."template_service_id" = "company_services"."template_service_id"
ON CONFLICT ("company_pricing_version_id","company_service_id","code") DO NOTHING;
