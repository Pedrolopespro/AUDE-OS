type MetaEnvironment = {
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  TOKEN_ENCRYPTION_KEY?: string;
};

export const instagramScopes = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
  "instagram_business_content_publish",
];

async function environment() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as MetaEnvironment;
}

export async function getMetaAppId() {
  const { META_APP_ID } = await environment();
  if (!META_APP_ID) {
    throw new Error("O aplicativo da Meta ainda não foi configurado.");
  }
  return META_APP_ID;
}

export async function getMetaSecrets() {
  const { META_APP_ID, META_APP_SECRET, TOKEN_ENCRYPTION_KEY } =
    await environment();
  if (!META_APP_ID || !META_APP_SECRET || !TOKEN_ENCRYPTION_KEY) {
    throw new Error("As credenciais seguras da Meta ainda não foram configuradas.");
  }
  return {
    appId: META_APP_ID,
    appSecret: META_APP_SECRET,
    encryptionKey: TOKEN_ENCRYPTION_KEY,
  };
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function importEncryptionKey(value: string) {
  const bytes = base64ToBytes(value);
  if (bytes.byteLength !== 32) {
    throw new Error("A chave de proteção dos tokens é inválida.");
  }
  return crypto.subtle.importKey(
    "raw",
    bytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptAccessToken(token: string, keyValue: string) {
  const key = await importEncryptionKey(keyValue);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(token);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
}

export async function decryptAccessToken(payload: string, keyValue: string) {
  const [ivPart, encryptedPart] = payload.split(".");
  if (!ivPart || !encryptedPart) throw new Error("Token protegido inválido.");
  const key = await importEncryptionKey(keyValue);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(ivPart) },
    key,
    base64ToBytes(encryptedPart),
  );
  return new TextDecoder().decode(decrypted);
}

export function callbackUrl(request: Request) {
  return new URL("/api/meta/instagram/callback", request.url).toString();
}
