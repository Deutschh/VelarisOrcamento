export class ConfigurationLifecycleError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "ConfigurationLifecycleError";
  }
}

export interface FieldCondition {
  sourceFieldCode: string;
  operator: "equals" | "not_equals" | "includes";
  value: string | number | boolean | string[] | number[];
}

export type ConditionAnswers = Record<
  string,
  string | number | boolean | string[] | number[]
>;

export function assertDraftConfiguration(status: string) {
  if (status !== "draft") {
    throw new ConfigurationLifecycleError(
      "Published or archived configurations cannot be edited.",
      "CONFIGURATION_NOT_EDITABLE",
    );
  }
}

export function shouldShowField(input: {
  condition: FieldCondition | null;
  answers: ConditionAnswers;
}) {
  if (!input.condition) {
    return true;
  }

  const answer = input.answers[input.condition.sourceFieldCode];

  if (input.condition.operator === "equals") {
    return valuesMatch(answer, input.condition.value);
  }

  if (input.condition.operator === "not_equals") {
    return !valuesMatch(answer, input.condition.value);
  }

  return arrayIncludes(answer, input.condition.value);
}

function valuesMatch(
  answer: ConditionAnswers[string] | undefined,
  expected: FieldCondition["value"],
) {
  if (answer === undefined) {
    return false;
  }

  return JSON.stringify(answer) === JSON.stringify(expected);
}

function arrayIncludes(
  answer: ConditionAnswers[string] | undefined,
  expected: FieldCondition["value"],
) {
  if (!Array.isArray(answer)) {
    return valuesMatch(answer, expected);
  }

  const answerValues: Array<string | number> = answer;

  if (Array.isArray(expected)) {
    const expectedValues: Array<string | number> = expected;
    return expectedValues.every((value) =>
      answerValues.some((answerValue) => answerValue === value),
    );
  }

  if (typeof expected === "boolean") {
    return false;
  }

  return answerValues.some((answerValue) => answerValue === expected);
}
