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

/**
 * Unicode-safe Base64 encoding. Handles any characters, not just Latin-1.
 */
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Encode a study data object as a Base64 JSON string and redirect to Qualtrics.
 * The data is passed as a single `data` query parameter, with `pid` also passed
 * as a standalone param for easy Qualtrics linking.
 */
export function redirectWithEncodedData(
  qualtricsUrl: string,
  studyData: Record<string, unknown>
): void {
  const jsonString = JSON.stringify(studyData);
  const encoded = toBase64(jsonString);
  const pid = (studyData.pid as string) ?? "";

  redirectToQualtrics(qualtricsUrl, {
    pid,
    data: encoded,
  });
}
