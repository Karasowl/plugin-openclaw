/**
 * Shared state between hooks within a single message lifecycle.
 * Tracks which sessions have been flagged by the message gate
 * as triggered (matching a hashtag/command) and denied (no credits / cooldown).
 *
 * This prevents hard gates from blocking normal (non-triggered) messages.
 * Sessions auto-expire after SESSION_TTL_MS to prevent memory leaks
 * when a session never reaches message_sending (e.g. observe mode, errors).
 */

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

export type DenialReason = "no_credits" | "cooldown";

const deniedSessions = new Map<string, DenialReason>();
const triggeredSessions = new Set<string>();
const sessionTimestamps = new Map<string, number>();

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, ts] of sessionTimestamps) {
    if (now - ts > SESSION_TTL_MS) {
      deniedSessions.delete(key);
      triggeredSessions.delete(key);
      sessionTimestamps.delete(key);
    }
  }
}

export function markSessionDenied(sessionKey: string, reason: DenialReason): void {
  deniedSessions.set(sessionKey, reason);
}

export function markSessionTriggered(sessionKey: string): void {
  // Clear any stale state from a previous use of this sessionKey
  // BEFORE refreshing the timestamp, so pruneExpired can't be tricked
  // by the fresh timestamp shielding old denied state.
  deniedSessions.delete(sessionKey);

  pruneExpired();
  triggeredSessions.add(sessionKey);
  sessionTimestamps.set(sessionKey, Date.now());
}

export function isSessionDenied(sessionKey: string): boolean {
  pruneExpired();
  return deniedSessions.has(sessionKey);
}

export function getDenialReason(sessionKey: string): DenialReason | null {
  pruneExpired();
  return deniedSessions.get(sessionKey) ?? null;
}

export function isSessionTriggered(sessionKey: string): boolean {
  pruneExpired();
  return triggeredSessions.has(sessionKey);
}

export function clearSession(sessionKey: string): void {
  deniedSessions.delete(sessionKey);
  triggeredSessions.delete(sessionKey);
  sessionTimestamps.delete(sessionKey);
}
