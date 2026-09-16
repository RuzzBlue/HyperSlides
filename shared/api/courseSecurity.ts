import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { CoursePackageManifest } from '../types.ts';
import { loadCourse } from './courses.ts';
import { readUserState } from './userSettings.ts';

export type CourseLockKind = 'access' | 'author';

export type CourseLockPublic = {
  enabled: boolean;
  hint?: string;
  allowReset?: boolean;
  /** True when a password hash is stored. */
  configured?: boolean;
};

export type CourseSecurityInput = {
  accessEnabled?: boolean;
  accessPassword?: string;
  accessHint?: string;
  accessAllowReset?: boolean;
  authorEnabled?: boolean;
  authorPassword?: string;
  authorHint?: string;
  authorAllowReset?: boolean;
};

type LockSecret = {
  enabled: boolean;
  hint?: string;
  allowReset: boolean;
  salt: string;
  hash: string;
};

type EncryptedBlob = {
  v: 1;
  alg: 'aes-256-gcm';
  iv: string;
  tag: string;
  data: string;
};

export type CourseSecurityFile = {
  v: 1;
  /** Encrypted creator userId for forgot-password reset. */
  creatorIdEnc: EncryptedBlob;
  access?: LockSecret | null;
  author?: LockSecret | null;
};

const CREATOR_KEY_SALT = 'hyperclass-course-creator-v1';
const HASH_KEYLEN = 64;

function securityPath(courseRoot: string): string {
  return path.join(courseRoot, 'security.json');
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

function deriveCreatorKey(): Buffer {
  return crypto.createHash('sha256').update(CREATOR_KEY_SALT).digest();
}

export function encryptCreatorId(userId: string): EncryptedBlob {
  const key = deriveCreatorKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(userId, 'utf8'), cipher.final()]);
  return {
    v: 1,
    alg: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64'),
  };
}

export function decryptCreatorId(blob: EncryptedBlob): string {
  if (blob.v !== 1 || blob.alg !== 'aes-256-gcm') {
    throw new Error('Unsupported creator id format');
  }
  const key = deriveCreatorKey();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(blob.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(blob.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(blob.data, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function hashPassword(password: string, saltB64?: string): { salt: string; hash: string } {
  const salt = saltB64 ? Buffer.from(saltB64, 'base64') : crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, HASH_KEYLEN);
  return { salt: salt.toString('base64'), hash: hash.toString('base64') };
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  try {
    const next = hashPassword(password, salt);
    const a = Buffer.from(next.hash, 'base64');
    const b = Buffer.from(hash, 'base64');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function readCourseSecurity(courseRoot: string): CourseSecurityFile | null {
  const abs = securityPath(courseRoot);
  if (!fs.existsSync(abs)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(abs, 'utf-8')) as CourseSecurityFile;
    if (!raw || raw.v !== 1 || !raw.creatorIdEnc) return null;
    return raw;
  } catch {
    return null;
  }
}

function publicFromSecret(lock: LockSecret | null | undefined): CourseLockPublic {
  if (!lock) return { enabled: false, allowReset: true, configured: false };
  return {
    enabled: Boolean(lock.enabled),
    hint: lock.hint || undefined,
    allowReset: lock.allowReset !== false,
    configured: Boolean(lock.hash && lock.salt),
  };
}

export function publicLocksFromSecurity(sec: CourseSecurityFile | null): {
  passwordLock: CourseLockPublic;
  authorLock: CourseLockPublic;
} {
  return {
    passwordLock: publicFromSecret(sec?.access),
    authorLock: publicFromSecret(sec?.author),
  };
}

function buildLockSecret(
  enabled: boolean,
  password: string | undefined,
  hint: string | undefined,
  allowReset: boolean,
  previous: LockSecret | null | undefined,
): LockSecret | null {
  if (!enabled) return null;
  const trimmed = password?.trim() ?? '';
  if (trimmed) {
    const { salt, hash } = hashPassword(trimmed);
    return {
      enabled: true,
      hint: hint?.trim() || undefined,
      allowReset,
      salt,
      hash,
    };
  }
  if (previous?.hash && previous?.salt) {
    return {
      enabled: true,
      hint: hint?.trim() || previous.hint,
      allowReset,
      salt: previous.salt,
      hash: previous.hash,
    };
  }
  throw new Error('Password is required when enabling a security lock');
}

/**
 * Write security.json and return public lock metadata for manifest.json.
 * Stamps encrypted creator userId from the installation profile when missing.
 */
export function writeCourseSecurity(
  appRoot: string,
  courseRoot: string,
  input: CourseSecurityInput | undefined,
): { passwordLock: CourseLockPublic; authorLock: CourseLockPublic } {
  const existing = readCourseSecurity(courseRoot);
  const profile = readUserState(appRoot).profile;
  const creatorIdEnc =
    existing?.creatorIdEnc ?? encryptCreatorId(profile.userId);

  if (!input) {
    const locks = publicLocksFromSecurity(existing);
    if (!existing) {
      // Ensure creator id is stored even when no locks are set.
      writeJson(securityPath(courseRoot), { v: 1, creatorIdEnc } satisfies CourseSecurityFile);
    }
    return locks;
  }

  const accessAllowReset = input.accessAllowReset !== false;
  const authorAllowReset = input.authorAllowReset !== false;

  const access = buildLockSecret(
    Boolean(input.accessEnabled),
    input.accessPassword,
    input.accessHint,
    accessAllowReset,
    existing?.access,
  );
  const author = buildLockSecret(
    Boolean(input.authorEnabled),
    input.authorPassword,
    input.authorHint,
    authorAllowReset,
    existing?.author,
  );

  const next: CourseSecurityFile = {
    v: 1,
    creatorIdEnc,
    access,
    author,
  };
  writeJson(securityPath(courseRoot), next);
  return publicLocksFromSecurity(next);
}

export function verifyCourseLockPassword(
  appRoot: string,
  courseId: string,
  kind: CourseLockKind,
  password: string,
): { ok: true; hint?: string } | { ok: false; error: string; hint?: string } {
  const loaded = loadCourse(appRoot, courseId);
  if (!loaded) return { ok: false, error: 'Course not found' };
  const sec = readCourseSecurity(loaded.rootPath);
  const lock = kind === 'access' ? sec?.access : sec?.author;
  if (!lock?.enabled) return { ok: true };
  if (!lock.hash || !lock.salt) {
    return { ok: false, error: 'Password is not configured', hint: lock.hint };
  }
  if (!verifyPassword(password, lock.salt, lock.hash)) {
    return { ok: false, error: 'Incorrect password', hint: lock.hint };
  }
  return { ok: true, hint: lock.hint };
}

export function resetCourseLock(
  appRoot: string,
  courseId: string,
  kind: CourseLockKind,
  userId: string,
): { ok: true } | { ok: false; error: string } {
  const loaded = loadCourse(appRoot, courseId);
  if (!loaded) return { ok: false, error: 'Course not found' };
  const sec = readCourseSecurity(loaded.rootPath);
  if (!sec) return { ok: false, error: 'No security configuration found' };

  const lock = kind === 'access' ? sec.access : sec.author;
  if (!lock?.enabled) return { ok: true };
  if (lock.allowReset === false) {
    return { ok: false, error: 'Password reset is disabled for this lock' };
  }

  let creatorId: string;
  try {
    creatorId = decryptCreatorId(sec.creatorIdEnc);
  } catch {
    return { ok: false, error: 'Could not verify creator identity' };
  }
  if (userId.trim() !== creatorId) {
    return { ok: false, error: 'Creator user ID does not match' };
  }

  const next: CourseSecurityFile = {
    ...sec,
    access: kind === 'access' ? null : sec.access,
    author: kind === 'author' ? null : sec.author,
  };
  writeJson(securityPath(loaded.rootPath), next);

  // Keep package manifest flags in sync.
  const packagePath = path.join(loaded.rootPath, 'manifest.json');
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8')) as CoursePackageManifest;
    const pubs = publicLocksFromSecurity(next);
    pkg.passwordLock = pubs.passwordLock;
    pkg.authorLock = pubs.authorLock;
    writeJson(packagePath, pkg);
  }

  return { ok: true };
}

/** Sync public lock fields onto a package manifest object (mutates). */
export function applyPublicLocksToPackage(
  pkg: CoursePackageManifest,
  locks: { passwordLock: CourseLockPublic; authorLock: CourseLockPublic },
) {
  pkg.passwordLock = locks.passwordLock;
  pkg.authorLock = locks.authorLock;
}
