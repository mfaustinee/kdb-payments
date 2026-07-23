export async function onRequest(context: { request: Request; env: Record<string, string> }) {
  const env = context.env || {};
  let clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL || (typeof process !== 'undefined' && process.env ? process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL : '');
  let privateKey = env.GOOGLE_PRIVATE_KEY || (typeof process !== 'undefined' && process.env ? process.env.GOOGLE_PRIVATE_KEY : '');

  if (clientEmail) clientEmail = clientEmail.trim().replace(/^["']|["']$/g, '');
  if (privateKey) privateKey = privateKey.trim().replace(/^["']|["']$/g, '');

  const jsonHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: jsonHeaders });
  }

  const isConfigured = !!(clientEmail && privateKey);

  return new Response(
    JSON.stringify({
      status: "ok",
      mode: "service-account",
      configured: isConfigured,
      platform: "cloudflare-pages"
    }),
    { headers: jsonHeaders }
  );
}
