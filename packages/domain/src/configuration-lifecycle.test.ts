import { describe, expect, it } from "vitest";
import {
  ConfigurationLifecycleError,
  assertDraftConfiguration,
  shouldShowField,
} from "./configuration-lifecycle.js";

describe("configuration lifecycle", () => {
  it("blocks editing published configurations", () => {
    expect(() => assertDraftConfiguration("published")).toThrow(
      ConfigurationLifecycleError,
    );
  });

  it("evaluates equals conditions", () => {
    expect(
      shouldShowField({
        condition: {
          sourceFieldCode: "has_stains",
          operator: "equals",
          value: true,
        },
        answers: {
          has_stains: true,
        },
      }),
    ).toBe(true);
  });

  it("evaluates includes conditions", () => {
    expect(
      shouldShowField({
        condition: {
          sourceFieldCode: "item_type",
          operator: "includes",
          value: "sofa",
        },
        answers: {
          item_type: ["sofa", "chair"],
        },
      }),
    ).toBe(true);
  });
});
