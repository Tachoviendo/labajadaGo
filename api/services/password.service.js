import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

function parsePasswordHash(encodedHash) {
  if (typeof encodedHash !== "string") {
    return null;
  }

  const [algorithm, n, r, p, encodedSalt, encodedKey, ...extra] =
    encodedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    n !== String(SCRYPT_N) ||
    r !== String(SCRYPT_R) ||
    p !== String(SCRYPT_P) ||
    !encodedSalt ||
    !encodedKey ||
    extra.length > 0 ||
    !/^[A-Za-z0-9_-]+$/.test(encodedSalt) ||
    !/^[A-Za-z0-9_-]+$/.test(encodedKey)
  ) {
    return null;
  }

  const salt = Buffer.from(encodedSalt, "base64url");
  const key = Buffer.from(encodedKey, "base64url");
  if (
    salt.length !== SALT_LENGTH ||
    key.length !== KEY_LENGTH ||
    salt.toString("base64url") !== encodedSalt ||
    key.toString("base64url") !== encodedKey
  ) {
    return null;
  }

  return { salt, key };
}

export function isPasswordHash(encodedHash) {
  return parsePasswordHash(encodedHash) !== null;
}

export async function hashPassword(password) {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEMORY,
  });

  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password, encodedHash) {
  const parsedHash = parsePasswordHash(encodedHash);
  if (!parsedHash) {
    return false;
  }

  const actualKey = await scrypt(password, parsedHash.salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEMORY,
  });

  return timingSafeEqual(actualKey, parsedHash.key);
}
