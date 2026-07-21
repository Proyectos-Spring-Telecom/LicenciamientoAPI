# Documentación — licenciasAPI (SIGMA)

Índice de documentos de contexto, contratos y guías de consumo.

| Documento | Contenido |
|-----------|-----------|
| [contexto.md](./contexto.md) | Arquitectura, módulos, reglas de negocio y funcionalidades implementadas |
| [contratos.md](./contratos.md) | Contratos HTTP (endpoints, campos multipart, mapeos IdTipoFoto, respuestas GET, auth, usuarios) |
| [consumo-post-registros-angular.md](./consumo-post-registros-angular.md) | Guía Angular para `POST /registros` |
| [consumo-patch-registros-actualizar-angular.md](./consumo-patch-registros-actualizar-angular.md) | Guía Angular para `PATCH /registros_actualizar` |

**Fuente de verdad en código (archivos LC):**

- `src/registros/licencia-construccion.constants.ts` → `LC_FILE_TIPO_FOTO`, `LC_RESPONSE_PHOTO_MAP`, escalares (`ClaveCatastral`, etc.)
- `src/registros/licencias.constants.ts` → fotos transversales (`fachada` / `estacionamiento` / `bodega`)

Última actualización: **2026-07-20**.

