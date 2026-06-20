/** Safe JSON parse for fetch responses — avoids "Unexpected end of JSON input". */
export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ data: T | null; ok: boolean; status: number; error?: string }> {
  try {
    const res = await fetch(input, {
      credentials: "include",
      ...init,
    });

    const text = await res.text();
    if (!text.trim()) {
      return {
        data: null,
        ok: false,
        status: res.status,
        error: res.ok
          ? "Empty response from server"
          : `Request failed (${res.status})`,
      };
    }

    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      return {
        data: null,
        ok: false,
        status: res.status,
        error: "Invalid response from server. Please refresh and try again.",
      };
    }

    const err =
      !res.ok && data && typeof data === "object" && "error" in data
        ? String((data as { error: string }).error)
        : !res.ok
          ? `Request failed (${res.status})`
          : undefined;

    return { data, ok: res.ok, status: res.status, error: err };
  } catch (e) {
    return {
      data: null,
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}
