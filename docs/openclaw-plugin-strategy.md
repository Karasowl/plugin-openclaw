# Estrategia Para Este Repo

## Estado actual

El directorio estaba vacio. No habia estructura de proyecto, Git ni codigo previo que condicionara la arquitectura.

## Como funciona OpenClaw a nivel de plugins

Segun la documentacion oficial, OpenClaw soporta dos grandes categorias:

- plugin nativo de OpenClaw: `openclaw.plugin.json` mas un modulo de runtime
- bundle compatible: por ejemplo `.codex-plugin/plugin.json` o `.claude-plugin/plugin.json`

Para este repo, lo que interesa son los plugins nativos, porque son los que ejecutan codigo dentro del proceso de OpenClaw y pueden registrar capacidades reales.

Un plugin puede registrar, entre otras cosas:

- tools para el agente
- hooks
- channels
- providers
- rutas HTTP
- comandos CLI
- servicios
- context engines

## Descubrimiento e instalacion

OpenClaw descubre plugins en este orden:

1. `plugins.load.paths`
2. extensiones dentro del workspace
3. extensiones globales del state dir
4. plugins bundled con OpenClaw

La propia CLI documenta estos flujos:

```bash
openclaw plugins install ./extensions/voice-call
openclaw plugins install -l ./extensions/voice-call
openclaw plugins install @openclaw/voice-call
```

El punto importante es este:

- `openclaw plugins install <path>` copia o vincula el plugin al root de extensiones de la instancia activa
- la documentacion lo expresa como `~/.openclaw/extensions/<id>` en el caso por defecto
- OpenClaw soporta perfiles e instancias aisladas usando `--profile`, `OPENCLAW_STATE_DIR` y `OPENCLAW_CONFIG_PATH`

## Respuesta a la duda principal

Si, instalar un plugin "dentro de un OpenClaw especifico" es viable.

No se hace normalmente "inyectandolo" dentro del codigo fuente de OpenClaw, sino instalando el plugin en el state dir de esa instancia o perfil.

En la practica, esto apunta a uno de estos dos modelos:

### Modelo A: por perfil

```bash
openclaw --profile cliente-a plugins install @tu-scope/plugin-x
openclaw --profile cliente-b plugins install @tu-scope/plugin-x
```

Esto deberia aislar:

- config
- sesiones y credenciales
- caches
- root de extensiones instalado para esa instancia

### Modelo B: por variables de entorno

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/cliente-a.json \
OPENCLAW_STATE_DIR=~/.openclaw-cliente-a \
openclaw plugins install @tu-scope/plugin-x
```

La documentacion no dice literalmente en una sola linea "plugins install usa el profile", pero si junta dos hechos:

- `plugins install` instala en el root de extensiones del state dir activo
- `--profile` cambia el `OPENCLAW_STATE_DIR` y `OPENCLAW_CONFIG_PATH`

Conclusion: es una inferencia fuerte y razonable que `openclaw --profile X plugins install ...` instala para esa instancia.

## Que deberia ser este repo

La recomendacion es:

- no hacerlo solo una biblioteca
- no hacerlo un unico plugin gigante
- hacerlo un monorepo con plugins independientes

Estructura propuesta:

```text
plugin-openclaw/
  docs/
  plugins/
    plugin-a/
    plugin-b/
    plugin-c/
  packages/
    shared/
    dev-tools/
```

## Por que monorepo

- cada plugin puede publicarse con version propia
- se comparte infraestructura sin acoplar releases
- permite tener decenas o cientos de plugins sin convertir el proyecto en una sola unidad inmanejable
- facilita testing comun, linting comun y utilidades compartidas
- encaja con la forma en que OpenClaw instala plugins: un paquete por plugin

## Rol de una biblioteca compartida

Una biblioteca compartida si tiene sentido, pero como pieza interna:

- helpers para `registerTool`
- validadores
- wrappers de logging
- utilidades para config schemas
- contratos y tipos compartidos

No deberia ser el producto principal, salvo que despues quieran publicar un SDK propio para acelerar la creacion de plugins.

## Estrategia recomendada de publicacion

Cada plugin deberia ser un paquete independiente, por ejemplo:

- `@tu-scope/openclaw-plugin-foo`
- `@tu-scope/openclaw-plugin-bar`

Y, si hace falta, un paquete auxiliar:

- `@tu-scope/openclaw-plugin-shared`

Eso permite instalar desde cualquier OpenClaw especifico con un comando directo.

## Flujo recomendado para desarrollo

### Desarrollo local

```bash
openclaw --profile dev plugins install -l ./plugins/plugin-a
```

Ventaja:

- enlace local sin copiar
- iteracion rapida
- mismo flujo conceptual que produccion

### Publicacion

```bash
openclaw --profile cliente-a plugins install @tu-scope/openclaw-plugin-a
```

Ventaja:

- despliegue simple
- versionado por plugin
- instalacion selectiva por cliente o por instancia

## Decision provisional

La mejor apuesta inicial para este repo es:

1. monorepo
2. plugins nativos de OpenClaw como paquetes independientes
3. biblioteca compartida interna opcional
4. soporte de instalacion por perfil como mecanismo principal de despliegue

## Siguientes pasos concretos

1. Inicializar el repo como workspace con `pnpm`.
2. Crear un plugin minimo de referencia.
3. Agregar un script raiz que simplifique:

```bash
pnpm install:profile --profile cliente-a --plugin plugin-a
```

4. Probar el flujo con una instancia real de OpenClaw.
5. Decidir despues si conviene publicar un CLI auxiliar propio.

## Fuentes revisadas

- https://docs.openclaw.ai/tools/plugin
- https://docs.openclaw.ai/plugins/agent-tools
- https://docs.openclaw.ai/plugins/architecture
- https://docs.openclaw.ai/gateway/multiple-gateways
- https://docs.openclaw.ai/plugins/zalouser
