export const DEFAULT_COMPANY_TIMEZONE = "America/Sao_Paulo" as const;

export function assertValidTimezone(timezone: string): string {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  return timezone;
}
