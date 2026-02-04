/**
 * Build a Qualtrics redirect URL with data parameters appended as query strings.
 *
 * @param qualtricsUrl - The full Qualtrics survey URL (e.g., "https://uni.qualtrics.com/jfe/form/SV_XXXXXXX")
 * @param data - Key-value pairs to pass back to Qualtrics as embedded data
 */
export function buildQualtricsRedirectUrl(
  qualtricsUrl: string,
  data: Record<string, string | number>
): string {
  const url = new URL(qualtricsUrl);
  for (const [key, value] of Object.entries(data)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * Redirect the browser to a Qualtrics survey, passing data as query parameters.
 */
export function redirectToQualtrics(
  qualtricsUrl: string,
  data: Record<string, string | number>
): void {
  window.location.href = buildQualtricsRedirectUrl(qualtricsUrl, data);
}
