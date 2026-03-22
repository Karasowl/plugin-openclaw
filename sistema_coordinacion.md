# 🤖 Sistema de Coordinación Multi-Agente (Claude Code + Codex)

## Prompt: Setup Multi-Agent Coordination System

Necesito que configures un sistema de coordinación multi-agente para este proyecto. En este repo trabajan DOS agentes de IA simultáneamente: tú (Claude Code) y Codex (OpenAI). Necesito que nunca se pisen los archivos.

## Lo que necesito que hagas:

### 1. Crea el archivo CLAUDE.md en la raíz del proyecto con estas reglas:

**Reglas para ti (Claude Code):**

- Tu identidad es "claude-agent"
- SIEMPRE antes de editar cualquier archivo, lee .agent-locks.json en la raíz
- Si el archivo aparece con agent "codex", NO lo toques bajo ninguna circunstancia
- Antes de editar un archivo, registra tu lock en .agent-locks.json
- Al terminar de trabajar, elimina tus locks de .agent-locks.json
- Siempre corre los tests antes de hacer commit: npx tsc --noEmit, npx vitest run, npx vite build
- Si necesitas un archivo que tiene Codex lockeado, escribe un mensaje en .agent-mail.json pidiendo que lo libere
- Al iniciar cada sesión, lee .agent-locks.json y .agent-mail.json para entender el estado actual

### 2. Crea el archivo AGENTS.md en la raíz del proyecto con las mismas reglas pero para Codex:

**Reglas para Codex (OpenAI):**

- Su identidad es "codex-agent"
- Mismas reglas de locks y coordinación
- Mismos comandos de tests
- Que lea .agent-locks.json antes de tocar cualquier cosa

### 3. Crea .agent-locks.json en la raíz con esta estructura inicial vacía:

```json
{
  "locks": [],
  "schema": {
    "file": "ruta del archivo",
    "agent": "claude-agent | codex-agent",
    "task": "descripción breve de qué está haciendo",
    "since": "ISO 8601 timestamp"
  }
}
```

### 4. Crea .agent-mail.json para comunicación entre agentes:

```json
{
  "messages": [],
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

### 5. Crea .agent-config.json con la configuración general:

Incluye:

- Lista de agentes registrados (claude-agent, codex-agent)
- Reglas de ownership por defecto si las hay
- Comando de tests que ambos deben correr
- Timestamp de última sincronización

### 6. Agrega al .gitignore que NO ignore estos archivos (deben estar trackeados en git)

### 7. Haz un commit con mensaje: "chore: setup multi-agent coordination system"

---

## IMPORTANTE:

- Los archivos CLAUDE.md y AGENTS.md deben ser COMPLETOS y DETALLADOS con instrucciones paso a paso
- Incluye ejemplos concretos de cómo lockear, liberar, y enviar mensajes
- Incluye una sección de "Al iniciar sesión, haz esto PRIMERO" con pasos numerados
- Hazlo robusto para que un agente que no sabe nada pueda seguir las instrucciones desde cero
- Ambos archivos deben explicar el formato JSON exacto para que el agente pueda manipularlo correctamente