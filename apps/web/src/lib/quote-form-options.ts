import type {
  CompanyFieldConfiguration,
  QuoteDraftItem,
  SchedulingMode,
} from "@velaris/shared";

type SelectOptions = Array<[string, string]>;

export interface CleaningSimulationState {
  itemType: string;
  quantity: number;
  size: string;
  seats: number;
  fabricType: string;
  dirtLevel: string;
  hasStains: boolean;
  odor: boolean;
  petHair: boolean;
  petsPresent: boolean;
  waterproofing: boolean;
  urgency: string;
  floor: number;
  hasElevator: boolean;
  parking: boolean;
  distanceKm: number;
}

export const cleaningSimulationSelectOptions: {
  itemType: SelectOptions;
  size: SelectOptions;
  fabricType: SelectOptions;
  dirtLevel: SelectOptions;
  urgency: SelectOptions;
} = {
  itemType: [
    ["sofa", "Sofa"],
    ["armchair", "Poltrona"],
    ["chair", "Cadeira"],
    ["mattress", "Colchao"],
    ["headboard", "Cabeceira"],
    ["puff", "Puff"],
    ["car_seat", "Banco automotivo"],
    ["rug", "Tapete"],
    ["carpet", "Carpete"],
    ["other", "Outro"],
  ],
  size: [
    ["small", "Pequeno"],
    ["medium", "Medio"],
    ["large", "Grande"],
  ],
  fabricType: [
    ["suede", "Suede"],
    ["synthetic_leather", "Couro sintetico"],
    ["linen", "Linho"],
    ["velvet", "Veludo"],
    ["other", "Outro"],
  ],
  dirtLevel: [
    ["light", "Leve"],
    ["medium", "Medio"],
    ["heavy", "Intenso"],
  ],
  urgency: [
    ["normal", "Normal"],
    ["urgent", "Urgente"],
  ],
};

export const defaultCleaningSimulation: CleaningSimulationState = {
  itemType: "sofa",
  quantity: 1,
  size: "medium",
  seats: 3,
  fabricType: "suede",
  dirtLevel: "medium",
  hasStains: false,
  odor: false,
  petHair: false,
  petsPresent: false,
  waterproofing: false,
  urgency: "normal",
  floor: 0,
  hasElevator: true,
  parking: true,
  distanceKm: 0,
};

export const schedulingModeLabels: Record<SchedulingMode, string> = {
  required_with_proposal: "Obrigatorio com proposta",
  optional_with_proposal: "Opcional com proposta",
  after_proposal_acceptance: "Depois do aceite",
  external_only: "Externo",
};

export function fieldOptions(
  draft: { service: { fields: CompanyFieldConfiguration[] } },
  fieldCode: string,
  fallback: SelectOptions,
) {
  const field = draft.service.fields.find((candidate) => candidate.code === fieldCode);
  const options =
    field?.options
      .filter((option) => option.isActive)
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((option): [string, string] => [option.code, option.label]) ?? [];

  return options.length > 0 ? options : fallback;
}

export function isQuoteFieldRequired(
  draft: { service: { fields: CompanyFieldConfiguration[] } },
  fieldCode: string,
) {
  return Boolean(
    draft.service.fields.find((field) => field.code === fieldCode)?.isRequired,
  );
}

export function isQuoteItemFieldVisible(
  draft: { service: { fields: CompanyFieldConfiguration[] } },
  fieldCode: string,
  item: QuoteDraftItem,
) {
  const field = draft.service.fields.find((candidate) => candidate.code === fieldCode);

  if (!field?.condition) {
    return true;
  }

  return matchesQuoteFieldCondition(
    field.condition,
    quoteItemConditionValue(item, field.condition.sourceFieldCode),
  );
}

export function parseIntegerInput(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseNumberInput(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function matchesQuoteFieldCondition(
  condition: NonNullable<CompanyFieldConfiguration["condition"]>,
  sourceValue: unknown,
) {
  if (condition.operator === "equals") {
    return valuesMatch(sourceValue, condition.value);
  }

  if (condition.operator === "not_equals") {
    return !valuesMatch(sourceValue, condition.value);
  }

  if (condition.operator === "includes") {
    return Array.isArray(sourceValue)
      ? sourceValue.some((item) => valuesMatch(item, condition.value))
      : false;
  }

  return true;
}

function quoteItemConditionValue(item: QuoteDraftItem, fieldCode: string) {
  const values: Record<string, unknown> = {
    dirt_level: item.dirtLevel,
    fabric_type: item.fabricType,
    has_stains: item.hasStains,
    item_type: item.itemType,
    odor: item.odor,
    pet_hair: item.petHair,
    pets_present: item.petsPresent,
    quantity: item.quantity,
    seats: item.seats,
    size: item.size,
    stain_type: item.stainTypes,
    waterproofing: item.waterproofing,
  };

  return values[fieldCode];
}

function valuesMatch(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}
