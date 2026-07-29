function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function bytesToBase64Url(value: Uint8Array) {
  return bytesToBase64(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
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

export function createInvitationToken() {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashInvitationToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function encryptAccessToken(token: string, keyValue: string) {
  const key = await importEncryptionKey(keyValue);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token),
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
