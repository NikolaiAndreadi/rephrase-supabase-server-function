const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
} as const;

export function newResponse<T>(
  data: T,
  status: number = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  const hasData = data !== undefined &&
    data !== null &&
    !(typeof data === "string" && data.trim() === "");

  const headers = {
    ...corsHeaders,
    ...(hasData ? { "Content-Type": "application/json" } : {}),
    ...extraHeaders,
  };

  return new Response(hasData ? JSON.stringify(data) : null, {
    status,
    headers,
  });
}
