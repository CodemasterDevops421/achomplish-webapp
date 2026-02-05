export function normalizeTimezone(timezone: string | null | undefined): string {
    if (!timezone) return "UTC";
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: timezone });
        return timezone;
    } catch {
        return "UTC";
    }
}
