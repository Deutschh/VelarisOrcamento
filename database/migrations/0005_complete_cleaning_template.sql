UPDATE "niche_templates"
SET
	"version" = 2,
	"description" = 'Template fixo completo para o MVP piloto de limpeza de estofados.',
	"updated_at" = now()
WHERE "code" = 'cleaning_upholstery';--> statement-breakpoint
UPDATE "template_fields"
SET
	"is_required_default" = CASE
		WHEN "code" IN ('size', 'fabric_type') THEN true
		ELSE "is_required_default"
	END,
	"help_text" = CASE
		WHEN "code" = 'size' THEN 'Ajuda a estimar o esforco e os insumos do atendimento.'
		WHEN "code" = 'fabric_type' THEN 'Alguns tecidos podem exigir cuidado ou tempo adicional.'
		WHEN "code" = 'floor' THEN 'Usado para avaliar dificuldade de acesso.'
		WHEN "code" = 'has_elevator' THEN 'Usado para avaliar deslocamento interno e acesso.'
		WHEN "code" = 'parking' THEN 'Usado para avaliar acesso e tempo de atendimento.'
		WHEN "code" = 'service_address' THEN 'Usado para atendimento e estimativa de deslocamento.'
		WHEN "code" = 'photos' THEN 'Fotos ajudam a empresa a analisar o estofado.'
		ELSE "help_text"
	END,
	"updated_at" = now()
WHERE
	"template_service_id" = '10000000-0000-4000-8000-000000000101'
	AND "code" IN (
		'size',
		'fabric_type',
		'floor',
		'has_elevator',
		'parking',
		'service_address',
		'photos'
	);--> statement-breakpoint
UPDATE "template_pricing_rules"
SET
	"quantity_field_code" = CASE
		WHEN "code" IN (
			'sofa_seats_addition',
			'stains_addition',
			'odor_addition',
			'pet_hair_addition',
			'waterproofing_addition'
		) THEN 'quantity'
		ELSE "quantity_field_code"
	END,
	"updated_at" = now()
WHERE
	"template_service_id" = '10000000-0000-4000-8000-000000000101'
	AND "code" IN (
		'sofa_seats_addition',
		'stains_addition',
		'odor_addition',
		'pet_hair_addition',
		'waterproofing_addition'
	);--> statement-breakpoint
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
	('10000000-0000-4000-8000-000000020023', '10000000-0000-4000-8000-000000000101', 'fabric_synthetic_leather_addition', 'Adicional couro sintetico', 'fixed_addition', NULL, NULL, 'quantity', 15.00, NULL, NULL, NULL, NULL, NULL, '{"sourceFieldCode":"fabric_type","operator":"equals","value":"synthetic_leather"}'::jsonb, NULL, NULL, true, 43),
	('10000000-0000-4000-8000-000000020024', '10000000-0000-4000-8000-000000000101', 'fabric_linen_addition', 'Adicional linho', 'fixed_addition', NULL, NULL, 'quantity', 20.00, NULL, NULL, NULL, NULL, NULL, '{"sourceFieldCode":"fabric_type","operator":"equals","value":"linen"}'::jsonb, NULL, NULL, true, 44),
	('10000000-0000-4000-8000-000000020025', '10000000-0000-4000-8000-000000000101', 'fabric_velvet_addition', 'Adicional veludo', 'fixed_addition', NULL, NULL, 'quantity', 25.00, NULL, NULL, NULL, NULL, NULL, '{"sourceFieldCode":"fabric_type","operator":"equals","value":"velvet"}'::jsonb, NULL, NULL, true, 45),
	('10000000-0000-4000-8000-000000020026', '10000000-0000-4000-8000-000000000101', 'fabric_other_addition', 'Adicional tecido especial', 'fixed_addition', NULL, NULL, 'quantity', 10.00, NULL, NULL, NULL, NULL, NULL, '{"sourceFieldCode":"fabric_type","operator":"equals","value":"other"}'::jsonb, NULL, NULL, true, 46),
	('10000000-0000-4000-8000-000000020027', '10000000-0000-4000-8000-000000000101', 'access_no_elevator_floor_addition', 'Adicional por andar sem elevador', 'fixed_addition', 'floor', NULL, NULL, 30.00, NULL, NULL, 2.0000, NULL, 'unit', '{"sourceFieldCode":"has_elevator","operator":"equals","value":false}'::jsonb, NULL, NULL, true, 820),
	('10000000-0000-4000-8000-000000020028', '10000000-0000-4000-8000-000000000101', 'access_no_parking_addition', 'Adicional sem estacionamento', 'fixed_addition', NULL, NULL, NULL, 15.00, NULL, NULL, NULL, NULL, NULL, '{"sourceFieldCode":"parking","operator":"equals","value":false}'::jsonb, NULL, NULL, true, 830),
	('10000000-0000-4000-8000-000000020029', '10000000-0000-4000-8000-000000000101', 'distance_fee', 'Taxa de deslocamento', 'distance_fee', 'distance_km', NULL, NULL, 3.50, NULL, NULL, 10.0000, NULL, 'km', NULL, NULL, NULL, true, 850),
	('10000000-0000-4000-8000-000000020030', '10000000-0000-4000-8000-000000000101', 'quantity_discount', 'Desconto por quantidade', 'administrative_discount', 'quantity', NULL, NULL, NULL, 500, NULL, 3.0000, NULL, 'unit', NULL, NULL, NULL, true, 870)
ON CONFLICT ("template_service_id","code") DO NOTHING;--> statement-breakpoint
UPDATE "company_service_fields" AS "company_service_fields"
SET
	"is_required" = true,
	"is_pricing_relevant" = true,
	"help_text" = COALESCE("company_service_fields"."help_text", "template_fields"."help_text"),
	"updated_at" = now()
FROM "company_services", "company_configurations", "template_fields"
WHERE
	"company_services"."id" = "company_service_fields"."company_service_id"
	AND "company_configurations"."id" = "company_services"."company_configuration_id"
	AND "template_fields"."id" = "company_service_fields"."template_field_id"
	AND "company_configurations"."status" = 'draft'
	AND "template_fields"."code" IN ('size', 'fabric_type');--> statement-breakpoint
UPDATE "company_pricing_rules" AS "company_pricing_rules"
SET
	"quantity_field_code" = "template_pricing_rules"."quantity_field_code",
	"updated_at" = now()
FROM "company_pricing_versions", "template_pricing_rules"
WHERE
	"company_pricing_versions"."id" = "company_pricing_rules"."company_pricing_version_id"
	AND "template_pricing_rules"."id" = "company_pricing_rules"."template_pricing_rule_id"
	AND "company_pricing_versions"."status" = 'draft'
	AND "template_pricing_rules"."code" IN (
		'sofa_seats_addition',
		'stains_addition',
		'odor_addition',
		'pet_hair_addition',
		'waterproofing_addition'
	);--> statement-breakpoint
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
WHERE "company_pricing_versions"."status" = 'draft'
ON CONFLICT ("company_pricing_version_id","company_service_id","code") DO NOTHING;
