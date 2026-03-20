# Codex Agent Coordination Guide

This file defines the required coordination protocol for Codex inside this repository.

## Identity

- Agent ID: `codex-agent`
- Peer agent: `claude-agent`
- Lock file: `.agent-locks.json`
- Mail file: `.agent-mail.json`
- Shared config: `.agent-config.json`

## Non-negotiable rules

- Always read `.agent-locks.json` before editing any file.
- Always read `.agent-mail.json` at session start.
- If a file is locked by `claude-agent`, do not edit it.
- Before editing any file, register your own lock in `.agent-locks.json`.
- When you finish, remove only your own locks.
- Never delete or overwrite a lock owned by `claude-agent`.
- If you need a file that `claude-agent` has locked, write a message to `.agent-mail.json`.
- Before any commit, run:
  - `npx tsc --noEmit`
  - `npx vitest run`
  - `npx vite build`

## At session start, do this FIRST

1. Read `.agent-config.json` to confirm the current protocol and test commands.
2. Read `.agent-locks.json` to see which files are currently reserved.
3. Read `.agent-mail.json` to check pending coordination messages.
4. Identify which files you need for the current task.
5. Verify that none of those files are locked by `claude-agent`.
6. Only then add your own lock entries and start editing.

If any coordination file is missing or malformed, stop and repair the coordination files before editing product code.

## Lock workflow

### Rule

Every file edit requires a lock entry first.

### Exact JSON format

`.agent-locks.json` must keep this shape:

```json
{
  "locks": [
    {
      "file": "relative/path/to/file.ts",
      "agent": "codex-agent",
      "task": "brief description of the work",
      "since": "2026-03-19T22:32:45.0740018-06:00"
    }
  ],
  "schema": {
    "file": "ruta del archivo",
    "agent": "claude-agent | codex-agent",
    "task": "descripcion breve de que esta haciendo",
    "since": "ISO 8601 timestamp"
  }
}
```

### How to claim a file

1. Read `.agent-locks.json`.
2. Search `locks` for the target path.
3. If the path is already locked by `claude-agent`, do not touch it.
4. If the path is free, append a new object with:
   - `file`: relative path from repo root
   - `agent`: `codex-agent`
   - `task`: short actionable description
   - `since`: current ISO 8601 timestamp
5. Save `.agent-locks.json`.
6. Start editing only after the lock is persisted.

### How to release a file

1. Finish editing the file.
2. Save the final content.
3. Remove only the lock objects where:
   - `file` matches the file you edited
   - `agent` is `codex-agent`
4. Save `.agent-locks.json`.

### Example: lock one file

```json
{
  "locks": [
    {
      "file": "src/plugin.ts",
      "agent": "codex-agent",
      "task": "implement command routing",
      "since": "2026-03-19T22:32:45.0740018-06:00"
    }
  ],
  "schema": {
    "file": "ruta del archivo",
    "agent": "claude-agent | codex-agent",
    "task": "descripcion breve de que esta haciendo",
    "since": "ISO 8601 timestamp"
  }
}
```

### Example: release after finishing

```json
{
  "locks": [],
  "schema": {
    "file": "ruta del archivo",
    "agent": "claude-agent | codex-agent",
    "task": "descripcion breve de que esta haciendo",
    "since": "ISO 8601 timestamp"
  }
}
```

## Mail workflow

Use the mail file when you need coordination with the other agent.

### Exact JSON format

`.agent-mail.json` must keep this shape:

```json
{
  "messages": [
    {
      "from": "codex-agent",
      "to": "claude-agent",
      "subject": "need lock release",
      "body": "Please release src/plugin.ts when you finish. I need it for test fixes.",
      "timestamp": "2026-03-19T22:32:45.0740018-06:00",
      "read": false
    }
  ],
  "schema": {
    "from": "agent id",
    "to": "agent id",
    "subject": "asunto",
    "body": "mensaje",
    "timestamp": "ISO 8601",
    "read": false
  }
}
```

### When to send mail

- You need a file locked by `claude-agent`.
- You want to hand off a task.
- You found a conflict or blocker.
- You need the other agent to validate or release something.

### How to send a message

1. Read `.agent-mail.json`.
2. Append a new message object to `messages`.
3. Set:
   - `from`: `codex-agent`
   - `to`: `claude-agent`
   - `subject`: short topic
   - `body`: exact request or status
   - `timestamp`: current ISO 8601 timestamp
   - `read`: `false`
4. Save `.agent-mail.json`.

### Example message

```json
{
  "messages": [
    {
      "from": "codex-agent",
      "to": "claude-agent",
      "subject": "request lock release",
      "body": "When you are done with docs/openclaw-plugin-strategy.md, please release it. I need to update the architecture section.",
      "timestamp": "2026-03-19T22:32:45.0740018-06:00",
      "read": false
    }
  ],
  "schema": {
    "from": "agent id",
    "to": "agent id",
    "subject": "asunto",
    "body": "mensaje",
    "timestamp": "ISO 8601",
    "read": false
  }
}
```

## Conflict policy

- Lock wins over intention.
- Existing lock wins over later lock.
- Never "share" a file informally.
- Never assume the other agent is done until the lock is removed.
- If a file is urgent and locked by `claude-agent`, send mail and work elsewhere.

## Multi-file tasks

If you need to edit multiple files:

1. Read the current lock file once.
2. Reserve all target files you truly need.
3. Keep the task description short but specific.
4. Release each lock as soon as that file is done.

Do not lock broad paths like `src/` or `docs/`. Lock concrete files only.

## Test and commit checklist

Before any commit, do all of the following:

1. Confirm your locks are up to date.
2. Run `npx tsc --noEmit`.
3. Run `npx vitest run`.
4. Run `npx vite build`.
5. Fix any failures.
6. Remove your locks from `.agent-locks.json`.
7. Then commit.

Never commit while leaving stale locks owned by `codex-agent`.

## Quick operational example

1. Read `.agent-config.json`, `.agent-locks.json`, `.agent-mail.json`.
2. See that `src/plugin.ts` is free.
3. Add a lock for `src/plugin.ts` with `agent: "codex-agent"`.
4. Edit `src/plugin.ts`.
5. Run the required tests.
6. Remove the lock for `src/plugin.ts`.
7. Commit if needed.

This workflow is mandatory for every editing session.
