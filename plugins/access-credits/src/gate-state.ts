/**
 * Shared state between hooks within a single message lifecycle.
 * Tracks which sessions have been flagged by the message gate
 * as triggered (matching a hashtag/command) and denied (no credits / cooldown).
 *
 * This prevents hard gates from blocking normal (non-triggered) messages.
 * Sessions auto-expire after SESSION_TTL_MS to prevent memory leaks
 * when a session never reaches message_sending (e.g. observe mode, errors).
 *
 * Two indexing strategies:
 * - sessionKey (primary) — used by agent lifecycle hooks (before_prompt_build,
 *   before_tool_call, before_model_resolve) which receive ctx.sessionKey
 * - conversation bridge (secondary, composite) — used by message_sending
 *   which has ctx.channelId + ctx.accountId + ctx.conversationId + event.to.
 *   channelId alone is the channel TYPE ("telegram"), not a conversation.
 *   Full composite key isolates per-user, per-conversation, per-account.
 */

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

export type DenialReason = "no_credits" | "cooldown";

const deniedSessions = new Map<string, DenialReason>();
const triggeredSessions = new Set<string>();
const sessionTimestamps = new Map<string, number>();

// Bridge maps: connect internal hook data (sessionKey, senderId, channelId)
// to lifecycle hooks which may only have sessionKey or channelId
const sessionSenders = new Map<string, string>();
// FIFO queue per composite key — supports concurrent sessions from the same sender
const channelToSession = new Map<string, string[]>();
// Reverse map: sessionKey → bridgeKey — enables cleanup from clearSession/pruneExpired
const sessionToBridge = new Map<string, string>();

function removeBridgeEntry(sessionKey: string): void {
  const bridgeKey = sessionToBridge.get(sessionKey);
  if (bridgeKey) {
    sessionToBridge.delete(sessionKey);
    const queue = channelToSession.get(bridgeKey);
    if (queue) {
      const idx = queue.indexOf(sessionKey);
      if (idx !== -1) queue.splice(idx, 1);
      if (queue.length === 0) channelToSession.delete(bridgeKey);
    }
  }
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, ts] of sessionTimestamps) {
    if (now - ts > SESSION_TTL_MS) {
      deniedSessions.delete(key);
      triggeredSessions.delete(key);
      sessionTimestamps.delete(key);
      sessionSenders.delete(key);
      removeBridgeEntry(key);
    }
  }
}

// === Core API (unchanged semantics) ===

export function markSessionDenied(sessionKey: string, reason: DenialReason): void {
  deniedSessions.set(sessionKey, reason);
}

export function markSessionTriggered(sessionKey: string): void {
  // Clear any stale state from a previous use of this sessionKey
  // BEFORE refreshing the timestamp, so pruneExpired can't be tricked
  // by the fresh timestamp shielding old denied state.
  deniedSessions.delete(sessionKey);
  // Purge stale bridge entry so the old queue doesn't return this
  // sessionKey for a conversation it no longer belongs to.
  removeBridgeEntry(sessionKey);

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
  sessionSenders.delete(sessionKey);
  removeBridgeEntry(sessionKey);
}

// === Bridge API (connects message:received to lifecycle hooks) ===

/**
 * Store the sender ID for a session. Called from message:received handler
 * which has both sessionKey and senderId.
 */
export function setSender(sessionKey: string, senderId: string): void {
  sessionSenders.set(sessionKey, senderId);
}

/**
 * Look up the sender ID for a session. Called from lifecycle hooks
 * that have ctx.sessionKey but no sender info.
 */
export function getSender(sessionKey: string): string | null {
  return sessionSenders.get(sessionKey) ?? null;
}

/** Fields that identify a unique conversation + sender. */
export interface ConversationBridgeKey {
  channelId: string;
  accountId?: string;
  conversationId?: string;
  senderId: string;
}

function buildBridgeKey(k: ConversationBridgeKey): string {
  return `${k.channelId}:${k.accountId ?? ""}:${k.conversationId ?? ""}:${k.senderId}`;
}

/**
 * Map a conversation+sender to its current sessionKey. Called from
 * message:received which has the full context. channelId alone is
 * just the channel type ("telegram") — accountId and conversationId
 * identify the specific bot account and chat/group.
 *
 * Uses a FIFO queue: concurrent sessions from the same sender in the
 * same channel each get their own slot instead of overwriting.
 */
export function setChannelSession(key: ConversationBridgeKey, sessionKey: string): void {
  const bridgeKey = buildBridgeKey(key);
  const queue = channelToSession.get(bridgeKey) ?? [];
  queue.push(sessionKey);
  channelToSession.set(bridgeKey, queue);
  sessionToBridge.set(sessionKey, bridgeKey);
}

/**
 * Look up sessionKey by conversation+sender (FIFO). Called from
 * message_sending which has ctx.channelId, ctx.accountId,
 * ctx.conversationId and event.to.
 *
 * Returns the oldest session that is still triggered; skips and
 * removes stale entries from the front of the queue.
 */
export function getSessionKeyByChannel(key: ConversationBridgeKey): string | null {
  const bridgeKey = buildBridgeKey(key);
  const queue = channelToSession.get(bridgeKey);
  if (!queue) return null;

  // Drain stale entries from the front
  while (queue.length > 0) {
    const sessionKey = queue[0];
    if (triggeredSessions.has(sessionKey)) {
      return sessionKey;
    }
    queue.shift();
    sessionToBridge.delete(sessionKey);
  }

  channelToSession.delete(bridgeKey);
  return null;
}

/**
 * Clear session state using conversation+sender as lookup key.
 * Clears the first triggered session in the FIFO queue.
 */
export function clearSessionByChannel(key: ConversationBridgeKey): void {
  const bridgeKey = buildBridgeKey(key);
  const queue = channelToSession.get(bridgeKey);
  if (!queue) return;

  for (let i = 0; i < queue.length; i++) {
    if (triggeredSessions.has(queue[i])) {
      clearSession(queue[i]);
      return;
    }
  }
}
