# plugin-openclaw

Base de trabajo para construir, versionar y publicar multiples plugins de OpenClaw desde un solo repositorio.

## Hallazgo clave

La direccion correcta para este proyecto no es una sola biblioteca gigante, sino un monorepo con:

- plugins independientes publicables por separado
- una libreria compartida opcional para utilidades comunes
- documentacion y scripts de instalacion por perfil o instancia

OpenClaw si permite una instalacion orientada a una instancia especifica, siempre que esa instancia use su propio perfil o `OPENCLAW_STATE_DIR`.

Ejemplo esperado:

```bash
openclaw --profile cliente-a plugins install @tu-scope/plugin-x
openclaw --profile cliente-b plugins install @tu-scope/plugin-y
```

## Documentacion interna

- [Estrategia de plugins](./docs/openclaw-plugin-strategy.md)

## Recomendacion actual

1. Tratar este repo como monorepo de plugins.
2. Publicar cada plugin como paquete independiente.
3. Mantener una libreria compartida solo para codigo reutilizable, no como producto principal.
4. Validar todo contra perfiles separados de OpenClaw desde el principio.

## Siguiente paso sugerido

Inicializar el monorepo y crear un plugin minimo de referencia junto con un script de instalacion para perfilar el flujo real de desarrollo y despliegue.
