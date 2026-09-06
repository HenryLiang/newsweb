import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// scrypt 加盐哈希,格式 salt:hash(hex)。Node 内置 crypto,免外部依赖

const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, KEY_LEN);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/** 密码强度:8-64 位,必须同时含字母和数字 */
export function passwordStrengthError(password: string): string | null {
  if (password.length < 8 || password.length > 64) return '密码长度需为 8-64 位';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
    return '密码需同时包含字母和数字';
  return null;
}
