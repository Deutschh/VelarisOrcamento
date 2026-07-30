import type { CompanyFieldConfiguration, SchedulingMode } from "@velaris/shared";

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

export function parseIntegerInput(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseNumberInput(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
