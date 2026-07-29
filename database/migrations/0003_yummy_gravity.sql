CREATE TYPE "public"."company_configuration_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."scheduling_mode" AS ENUM('required_with_proposal', 'optional_with_proposal', 'after_proposal_acceptance', 'external_only');--> statement-breakpoint
CREATE TYPE "public"."template_field_type" AS ENUM('text', 'textarea', 'number', 'currency', 'boolean', 'single_select', 'multi_select', 'measurement', 'address', 'date', 'image', 'file');--> statement-breakpoint
CREATE TABLE "company_configurations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"status" "company_configuration_status" DEFAULT 'draft' NOT NULL,
	"version" integer NOT NULL,
	"configuration_snapshot" jsonb,
	"created_from_configuration_id" uuid,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_field_options" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_service_field_id" uuid NOT NULL,
	"template_field_option_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_service_fields" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_service_id" uuid NOT NULL,
	"template_field_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_client_visible" boolean DEFAULT true NOT NULL,
	"is_company_editable" boolean DEFAULT true NOT NULL,
	"is_pricing_relevant" boolean DEFAULT false NOT NULL,
	"requires_photo" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"help_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_services" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_configuration_id" uuid NOT NULL,
	"template_service_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"scheduling_mode" "scheduling_mode" DEFAULT 'required_with_proposal' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"estimate_margin_lower" numeric(6, 2),
	"estimate_margin_upper" numeric(6, 2),
	"estimated_duration_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "niche_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_field_options" (
	"id" uuid PRIMARY KEY NOT NULL,
	"template_field_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active_default" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_fields" (
	"id" uuid PRIMARY KEY NOT NULL,
	"template_service_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"field_type" "template_field_type" NOT NULL,
	"help_text" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_required_default" boolean DEFAULT false NOT NULL,
	"is_active_default" boolean DEFAULT true NOT NULL,
	"is_client_visible_default" boolean DEFAULT true NOT NULL,
	"is_company_editable_default" boolean DEFAULT true NOT NULL,
	"is_pricing_relevant_default" boolean DEFAULT false NOT NULL,
	"requires_photo_default" boolean DEFAULT false NOT NULL,
	"condition" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_services" (
	"id" uuid PRIMARY KEY NOT NULL,
	"template_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active_default" boolean DEFAULT true NOT NULL,
	"default_scheduling_mode" "scheduling_mode" DEFAULT 'required_with_proposal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_configurations" ADD CONSTRAINT "company_configurations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_configurations" ADD CONSTRAINT "company_configurations_template_id_niche_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."niche_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_configurations" ADD CONSTRAINT "company_configurations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_configurations" ADD CONSTRAINT "company_configurations_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_field_options" ADD CONSTRAINT "company_field_options_company_service_field_id_company_service_fields_id_fk" FOREIGN KEY ("company_service_field_id") REFERENCES "public"."company_service_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_field_options" ADD CONSTRAINT "company_field_options_template_field_option_id_template_field_options_id_fk" FOREIGN KEY ("template_field_option_id") REFERENCES "public"."template_field_options"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_service_fields" ADD CONSTRAINT "company_service_fields_company_service_id_company_services_id_fk" FOREIGN KEY ("company_service_id") REFERENCES "public"."company_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_service_fields" ADD CONSTRAINT "company_service_fields_template_field_id_template_fields_id_fk" FOREIGN KEY ("template_field_id") REFERENCES "public"."template_fields"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_services" ADD CONSTRAINT "company_services_company_configuration_id_company_configurations_id_fk" FOREIGN KEY ("company_configuration_id") REFERENCES "public"."company_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_services" ADD CONSTRAINT "company_services_template_service_id_template_services_id_fk" FOREIGN KEY ("template_service_id") REFERENCES "public"."template_services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_field_options" ADD CONSTRAINT "template_field_options_template_field_id_template_fields_id_fk" FOREIGN KEY ("template_field_id") REFERENCES "public"."template_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_fields" ADD CONSTRAINT "template_fields_template_service_id_template_services_id_fk" FOREIGN KEY ("template_service_id") REFERENCES "public"."template_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_services" ADD CONSTRAINT "template_services_template_id_niche_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."niche_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_configurations_company_idx" ON "company_configurations" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_configurations_company_template_version_unique" ON "company_configurations" USING btree ("company_id","template_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "company_field_options_field_option_unique" ON "company_field_options" USING btree ("company_service_field_id","template_field_option_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_service_fields_service_field_unique" ON "company_service_fields" USING btree ("company_service_id","template_field_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_services_configuration_service_unique" ON "company_services" USING btree ("company_configuration_id","template_service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "niche_templates_code_unique" ON "niche_templates" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "template_field_options_field_code_unique" ON "template_field_options" USING btree ("template_field_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "template_fields_service_code_unique" ON "template_fields" USING btree ("template_service_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "template_services_template_code_unique" ON "template_services" USING btree ("template_id","code");--> statement-breakpoint
INSERT INTO "niche_templates" (
	"id",
	"code",
	"name",
	"description",
	"version",
	"is_active"
) VALUES (
	'10000000-0000-4000-8000-000000000001',
	'cleaning_upholstery',
	'Limpeza de estofados',
	'Template fixo inicial para o MVP piloto de limpeza de estofados.',
	1,
	true
) ON CONFLICT ("code") DO NOTHING;--> statement-breakpoint
INSERT INTO "template_services" (
	"id",
	"template_id",
	"code",
	"name",
	"description",
	"display_order",
	"is_active_default",
	"default_scheduling_mode"
) VALUES (
	'10000000-0000-4000-8000-000000000101',
	'10000000-0000-4000-8000-000000000001',
	'upholstery_cleaning',
	'Higienizacao de estofados',
	'Servico principal do nicho piloto.',
	10,
	true,
	'required_with_proposal'
) ON CONFLICT ("template_id","code") DO NOTHING;--> statement-breakpoint
INSERT INTO "template_fields" (
	"id",
	"template_service_id",
	"code",
	"label",
	"field_type",
	"help_text",
	"display_order",
	"is_required_default",
	"is_active_default",
	"is_client_visible_default",
	"is_company_editable_default",
	"is_pricing_relevant_default",
	"requires_photo_default",
	"condition"
) VALUES
	('10000000-0000-4000-8000-000000001001', '10000000-0000-4000-8000-000000000101', 'item_type', 'Tipo de item', 'single_select', NULL, 10, true, true, true, true, true, false, NULL),
	('10000000-0000-4000-8000-000000001002', '10000000-0000-4000-8000-000000000101', 'quantity', 'Quantidade', 'number', NULL, 20, true, true, true, true, true, false, NULL),
	('10000000-0000-4000-8000-000000001003', '10000000-0000-4000-8000-000000000101', 'size', 'Tamanho', 'single_select', NULL, 30, false, true, true, true, true, false, NULL),
	('10000000-0000-4000-8000-000000001004', '10000000-0000-4000-8000-000000000101', 'seats', 'Numero de lugares', 'number', 'Exibido para sofas.', 40, false, true, true, true, true, false, '{"sourceFieldCode":"item_type","operator":"equals","value":"sofa"}'::jsonb),
	('10000000-0000-4000-8000-000000001005', '10000000-0000-4000-8000-000000000101', 'fabric_type', 'Tipo de tecido', 'single_select', NULL, 50, false, true, true, true, true, false, NULL),
	('10000000-0000-4000-8000-000000001006', '10000000-0000-4000-8000-000000000101', 'dirt_level', 'Nivel de sujeira', 'single_select', NULL, 60, true, true, true, true, true, false, NULL),
	('10000000-0000-4000-8000-000000001007', '10000000-0000-4000-8000-000000000101', 'has_stains', 'Possui manchas?', 'boolean', NULL, 70, false, true, true, true, true, false, NULL),
	('10000000-0000-4000-8000-000000001008', '10000000-0000-4000-8000-000000000101', 'stain_type', 'Tipo de mancha', 'multi_select', 'Exibido quando o cliente informa manchas.', 80, false, true, true, true, true, false, '{"sourceFieldCode":"has_stains","operator":"equals","value":true}'::jsonb),
	('10000000-0000-4000-8000-000000001009', '10000000-0000-4000-8000-000000000101', 'odor', 'Possui odor?', 'boolean', NULL, 90, false, true, true, true, true, false, NULL),
	('10000000-0000-4000-8000-000000001010', '10000000-0000-4000-8000-000000000101', 'pet_hair', 'Possui pelos?', 'boolean', NULL, 100, false, true, true, true, true, false, NULL),
	('10000000-0000-4000-8000-000000001011', '10000000-0000-4000-8000-000000000101', 'pets_present', 'Ha animais no local?', 'boolean', NULL, 110, false, true, true, true, false, false, NULL),
	('10000000-0000-4000-8000-000000001012', '10000000-0000-4000-8000-000000000101', 'waterproofing', 'Deseja impermeabilizacao?', 'boolean', NULL, 120, false, true, true, true, true, false, NULL),
	('10000000-0000-4000-8000-000000001013', '10000000-0000-4000-8000-000000000101', 'urgency', 'Urgencia', 'single_select', NULL, 130, false, true, true, true, true, false, NULL),
	('10000000-0000-4000-8000-000000001014', '10000000-0000-4000-8000-000000000101', 'floor', 'Andar', 'number', NULL, 140, false, true, true, true, false, false, NULL),
	('10000000-0000-4000-8000-000000001015', '10000000-0000-4000-8000-000000000101', 'has_elevator', 'Possui elevador?', 'boolean', NULL, 150, false, true, true, true, false, false, NULL),
	('10000000-0000-4000-8000-000000001016', '10000000-0000-4000-8000-000000000101', 'parking', 'Possui estacionamento?', 'boolean', NULL, 160, false, true, true, true, false, false, NULL),
	('10000000-0000-4000-8000-000000001017', '10000000-0000-4000-8000-000000000101', 'service_address', 'Endereco do atendimento', 'address', NULL, 170, true, true, true, true, false, false, NULL),
	('10000000-0000-4000-8000-000000001018', '10000000-0000-4000-8000-000000000101', 'photos', 'Fotos', 'image', 'Fotos ajudam a empresa a analisar o estofado.', 180, false, true, true, true, false, true, NULL)
ON CONFLICT ("template_service_id","code") DO NOTHING;--> statement-breakpoint
INSERT INTO "template_field_options" (
	"id",
	"template_field_id",
	"code",
	"label",
	"display_order",
	"is_active_default"
) VALUES
	('10000000-0000-4000-8000-000000010001', '10000000-0000-4000-8000-000000001001', 'sofa', 'Sofa', 10, true),
	('10000000-0000-4000-8000-000000010002', '10000000-0000-4000-8000-000000001001', 'armchair', 'Poltrona', 20, true),
	('10000000-0000-4000-8000-000000010003', '10000000-0000-4000-8000-000000001001', 'chair', 'Cadeira', 30, true),
	('10000000-0000-4000-8000-000000010004', '10000000-0000-4000-8000-000000001001', 'mattress', 'Colchao', 40, true),
	('10000000-0000-4000-8000-000000010005', '10000000-0000-4000-8000-000000001001', 'headboard', 'Cabeceira', 50, true),
	('10000000-0000-4000-8000-000000010006', '10000000-0000-4000-8000-000000001001', 'puff', 'Puff', 60, true),
	('10000000-0000-4000-8000-000000010007', '10000000-0000-4000-8000-000000001001', 'car_seat', 'Banco automotivo', 70, true),
	('10000000-0000-4000-8000-000000010008', '10000000-0000-4000-8000-000000001001', 'rug', 'Tapete', 80, true),
	('10000000-0000-4000-8000-000000010009', '10000000-0000-4000-8000-000000001001', 'carpet', 'Carpete', 90, true),
	('10000000-0000-4000-8000-000000010010', '10000000-0000-4000-8000-000000001001', 'other', 'Outro', 100, true),
	('10000000-0000-4000-8000-000000010101', '10000000-0000-4000-8000-000000001003', 'small', 'Pequeno', 10, true),
	('10000000-0000-4000-8000-000000010102', '10000000-0000-4000-8000-000000001003', 'medium', 'Medio', 20, true),
	('10000000-0000-4000-8000-000000010103', '10000000-0000-4000-8000-000000001003', 'large', 'Grande', 30, true),
	('10000000-0000-4000-8000-000000010201', '10000000-0000-4000-8000-000000001005', 'suede', 'Suede', 10, true),
	('10000000-0000-4000-8000-000000010202', '10000000-0000-4000-8000-000000001005', 'synthetic_leather', 'Couro sintetico', 20, true),
	('10000000-0000-4000-8000-000000010203', '10000000-0000-4000-8000-000000001005', 'linen', 'Linho', 30, true),
	('10000000-0000-4000-8000-000000010204', '10000000-0000-4000-8000-000000001005', 'velvet', 'Veludo', 40, true),
	('10000000-0000-4000-8000-000000010205', '10000000-0000-4000-8000-000000001005', 'other', 'Outro', 50, true),
	('10000000-0000-4000-8000-000000010301', '10000000-0000-4000-8000-000000001006', 'light', 'Leve', 10, true),
	('10000000-0000-4000-8000-000000010302', '10000000-0000-4000-8000-000000001006', 'medium', 'Medio', 20, true),
	('10000000-0000-4000-8000-000000010303', '10000000-0000-4000-8000-000000001006', 'heavy', 'Intenso', 30, true),
	('10000000-0000-4000-8000-000000010401', '10000000-0000-4000-8000-000000001008', 'food', 'Comida', 10, true),
	('10000000-0000-4000-8000-000000010402', '10000000-0000-4000-8000-000000001008', 'beverage', 'Bebida', 20, true),
	('10000000-0000-4000-8000-000000010403', '10000000-0000-4000-8000-000000001008', 'ink', 'Tinta', 30, true),
	('10000000-0000-4000-8000-000000010404', '10000000-0000-4000-8000-000000001008', 'mold', 'Mofo', 40, true),
	('10000000-0000-4000-8000-000000010405', '10000000-0000-4000-8000-000000001008', 'other', 'Outro', 50, true),
	('10000000-0000-4000-8000-000000010501', '10000000-0000-4000-8000-000000001013', 'normal', 'Normal', 10, true),
	('10000000-0000-4000-8000-000000010502', '10000000-0000-4000-8000-000000001013', 'urgent', 'Urgente', 20, true)
ON CONFLICT ("template_field_id","code") DO NOTHING;
