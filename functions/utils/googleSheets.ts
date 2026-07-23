export async function getGoogleAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  if (!clientEmail || !privateKeyPem) {
    throw new Error("Service Account credentials (EMAIL/PRIVATE_KEY) are missing.");
  }

  let email = clientEmail.trim().replace(/^["']|["']$/g, '');

  // Clean the private key
  let privateKey = privateKeyPem.trim();
  if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error("Invalid Private Key format. It must start with '-----BEGIN PRIVATE KEY-----'. Check your environment variables.");
  }

  // Extract base64 DER payload from PEM
  const pemContents = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");

  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  // Import key into Web Crypto
  const importedKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (obj: any) => {
    const jsonStr = JSON.stringify(obj);
    const base64 = btoa(jsonStr);
    return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    importedKey,
    encoder.encode(unsignedToken)
  );

  const signatureArray = new Uint8Array(signatureBuffer);
  let signatureString = "";
  for (let i = 0; i < signatureArray.length; i++) {
    signatureString += String.fromCharCode(signatureArray[i]);
  }

  const signatureBase64 = btoa(signatureString)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsignedToken}.${signatureBase64}`;

  // Request Access Token from Google OAuth Endpoint
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    throw new Error(`Google Auth Token exchange failed (${tokenResponse.status}): ${errText}`);
  }

  const tokenData: any = await tokenResponse.json();
  return tokenData.access_token;
}

export async function appendToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rows: any[][]
) {
  const cleanSpreadsheetId = spreadsheetId.trim().replace(/^["']|["']$/g, '');
  const range = `${sheetName}!A:Z`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanSpreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: rows }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Sheets API append failed (${response.status}): ${errText}`);
  }

  return await response.json();
}
