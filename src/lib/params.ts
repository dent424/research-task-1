/**
 * Read URL query parameters on the client side.
 * Call from a client component or useEffect.
 */
export function getQueryParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

/**
 * Extract common study parameters from the URL.
 * Expected parameters passed from Qualtrics:
 *   - pid: participant ID
 *   - cond: condition assignment
 * Additional parameters can be read directly from the returned URLSearchParams.
 */
export function getStudyParams() {
  const params = getQueryParams();
  return {
    participantId: params.get("pid"),
    condition: params.get("cond"),
    allParams: params,
  };
}
