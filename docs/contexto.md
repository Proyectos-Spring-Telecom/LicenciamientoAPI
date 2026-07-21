# Contexto del backend — licenciasAPI (SIGMA)

Documento de contexto funcional y técnico. Resume lo implementado en registros, actualización, monitoreo, detalle, autenticación, usuarios y roles.

Stack: **NestJS 11**, **TypeORM 0.3**, **MySQL 8**, `multipart/form-data` (Multer), JWT + roles.

Última actualización: **2026-07-21**.

---

## 1. Propósito

API de captura y seguimiento de licencias municipales (predio / obra). Un registro (`Registros`) se bifurca por `PredioObra`:

| PredioObra | Significado | Secciones principales |
|------------|-------------|------------------------|
| `0` | No construcción / predio | Sapac, Catastro, Licencias (+ Contacto + ContactoRepresentante + RazonSocial), ProteccionCivil, fotos en `Fotos` |
| `1` | En construcción | LicenciaConstruccion (+ Corresponsables + ClaveCatastral), fotos en `FotosLicenciaConstruccion` |

Además existen **fotos transversales** de Licencias (`fachada`, `estacionamiento`, `bodega`) que se procesan en **ambos** valores de `PredioObra`.

---

## 2. Módulos relevantes

| Módulo | Responsabilidad |
|--------|-----------------|
| `src/registros/` | `POST /registros` (creación), listados, detalle, cambio de estatus |
| `src/registros_actualizar/` | `PATCH /registros_actualizar` (actualización parcial multipart) |
| `src/monitoreo/` | Listado y detalle con visibilidad por rol; el detalle es la fuente del mapper compartido |
| `src/auth/` | Login, refresh, logout, `GET /login/me`, recuperación de acceso |
| `src/usuarios/` | CRUD parcial de usuarios; GET con visibilidad por rol JWT |
| `src/roles/` | CRUD de roles y permisos (acceso clase `@Roles(4)`) |
| `src/dashboard/` | Métricas / captura por periodo |
| `src/entities/` | Entidades TypeORM (sin migraciones generadas desde estas tareas) |

**Detalle compartido:** `GET /registros/:idRegistro` delega en `MonitoreoService.findOne` (mismo contrato que `GET /monitoreo/:idRegistro`).

---

## 3. Funcionalidades implementadas

### 3.1 Creación — `POST /registros`

- Multipart plano con notación de puntos (`Sapac.NumeroCuenta`, `Licencias.RazonSocial`, `Licencias.ContactoRepresentante.Nombre`, `LicenciaConstruccion.Corresponsables[0].NombreCompleto`, etc.).
- `Estatus` fijo en `4`; `Registro` (folio) en `null`; capturista/grupo salen del JWT (`CapturistaVisita`).
- Flujo `PredioObra = 0`: crea Sapac/Catastro/Licencias/ProteccionCivil (aunque vengan vacíos); Contacto / ContactoRepresentante solo con datos útiles.
- Flujo `PredioObra = 1`: crea `LicenciaConstruccion` (constraint único por `IdRegistro`) + corresponsables + archivos LC.
- Archivos LC: **un campo multipart por `IdTipoFoto`**, `maxCount: 1`, fila en `FotosLicenciaConstruccion`.
- Escalares de **LicenciaConstruccion** (PredioObra = 1): `NumeroExpediente`, `NumeroControl`, `SeguimientoObra` (varchar ≤ 50), **`ClaveCatastral`** (varchar ≤ 100, texto), indicadores tinyint `0|1`.
- Escalares de **Licencias** (PredioObra = 0): incluye **`RazonSocial`** (varchar ≤ 200).
- Fotos transversales `Licencias.fachada|estacionamiento|bodega` se guardan aunque `PredioObra = 1`. El resto de datos de Licencias (incluido `RazonSocial` y `ContactoRepresentante`) **sí** respeta PredioObra.

### 3.2 Actualización — `PATCH /registros_actualizar`

- Actualización **parcial**: `undefined` / `null` / `''` / solo espacios **no sobrescriben**; el valor `0` sí es válido.
- `idRegistro` obligatorio. **No** se modifica `Estatus` (usar `PATCH /registros/:idRegistro/estatus`).
- `PredioObra efectivo`: body si viene; si no, el almacenado.
- Flujo 0: upsert Sapac/Catastro/Licencias (incluye `RazonSocial`, Contacto, ContactoRepresentante)/PC + fotos en `Fotos` (reemplazo no destructivo de `Ruta`).
- Flujo 1: upsert LicenciaConstruccion (incluye `ClaveCatastral`) / Corresponsables + archivos LC. Datos textuales de Licencias se **ignoran** (no se borran).
- Un solo campo útil (`Licencias.RazonSocial`, `Licencias.ContactoRepresentante.*`, `LicenciaConstruccion.ClaveCatastral`, etc.) cuenta como cambio válido.
- Transversales con PredioObra efectivo `1`: solo `fachada`/`estacionamiento`/`bodega`.
- Colisión body/archivo en LC: el parser conserva el escalar tinyint cuando el nombre también es de archivo.

### 3.3 Lectura — detalle `GET /registros/:idRegistro` y `GET /monitoreo/:idRegistro`

- Misma respuesta (wrapper `{ data }`).
- Campos planos del registro + visita/capturista/supervisor/grupos + arreglo `fotos` (tipos **6, 7, 8**), independiente de `PredioObra`.
- Si `PredioObra = 0`: anida Sapac, Catastro, **Licencias** (con `RazonSocial`, `Contacto`, `ContactoRepresentante`), ProteccionCivil (sin ContactoRepresentante; con su propio `RazonSocial`).
- Si `PredioObra = 1`: anida `LicenciaConstruccion` (incluye `ClaveCatastral: string | null`) + Corresponsables + **16 URLs nominales** de fotos LC.
- Duplicados históricos de fotos: fila de **Id mayor** por tipo; GET no escribe en BD.
- Nombres antiguos eliminados: `constanciaAlineamientoyNumero`, `LicenciaUsoyPlano`, `JuegoDePlanosArquitectonicos` (arrays).

### 3.4 Otros endpoints de registros / monitoreo

- `GET /registros` — listado paginado con visibilidad por rol (incluye `razonSocial` de Licencias en el item plano).
- `POST /registros/por-rango-fechas` — filtro por fechas.
- `PATCH /registros/:idRegistro/estatus` — cambio de estatus (roles 2/3/4).
- `GET /monitoreo` — listado plano (sin wrapper `data`).

### 3.5 Autenticación — `src/auth/`

- Login (`POST /login`), refresh, logout.
- `GET /login/me`: `id`, nombre completo, `UserName`, `PhoneNumber`, `permisos`, `nombreRol`, `nombreGrupo`, `ultimoLogin`.
- Login actualiza `Usuarios.UltimoLogin`.
- JWT / `request.user` (`AuthenticatedUser`): `userId`, `email`, `idGrupo`, `rol`.

### 3.6 Usuarios — visibilidad en GET

| Rol JWT | List / paginado | Por grupo | Por ID |
|---------|-----------------|-----------|--------|
| **4** | Todos | Cualquier grupo | Sin filtro de alcance |
| **3** | Todos excepto `IdRol = 4` | Cualquier grupo, excepto rol 4 | Sin filtro de alcance |
| **2** | Mismo `IdGrupo` del token y `IdRol <> 4` | Solo su grupo del token; otro → **403** | Sin filtro de alcance |
| **1** | **403** | **403** | Sin filtro de alcance |
| Inválido / ausente | **403** | **403** | — |
| Rol **2** sin grupo | **403** | **403** | — |

- Alcance solo del JWT (no de query/path/body).
- Filtrado en SQL; `paginated.total` = usuarios visibles.
- POST / PATCH de usuarios no cambiaron por esta regla.

### 3.7 Roles

- Clase `@Roles(4)`.
- `GET /roles/list` y paginado: sin filtro adicional por rol del token.

---

## 4. Reglas transversales de archivos

### 4.1 Solo archivos (no datos) de Licencias

```text
Licencias.fachada         → IdTipoFoto 6
Licencias.estacionamiento → IdTipoFoto 7
Licencias.bodega          → IdTipoFoto 8
```

| PredioObra efectivo | Datos Licencias / Contacto / ContactoRepresentante / RazonSocial | Archivos 6/7/8 |
|---------------------|------------------------------------------------------------------|----------------|
| `0` | Sí | Sí (si llegan) |
| `1` | No (se ignoran; no se borran) | Sí (si llegan) |

### 4.2 Reemplazo no destructivo (PATCH)

1. Guardar archivo nuevo (UUID, carpeta `{idRegistro}/{idTipoFoto}/`).
2. Buscar fila por clave de negocio.
3. Si existe → conservar `Id`, actualizar solo `Ruta` (+ `FechaHora` en LC).
4. Si no → crear fila.
5. **No** eliminar el archivo físico anterior.

### 4.3 MIME permitidos

JPG / JPEG / PNG / PDF.

---

## 5. Catálogo IdTipoFoto (resumen)

### Tabla `Fotos` (1–9)

| Id | Uso |
|----|-----|
| 1 | Licencia de funcionamiento |
| 2 | Recibo predial |
| 3 | Recibo SAPAC |
| 4 | Carátula medidor |
| 5 | Cuadro medidor |
| 6 | Fachada (transversal) |
| 7 | Estacionamiento (transversal) |
| 8 | Bodega (transversal) |
| 9 | Visto bueno PC |

### Tabla `FotosLicenciaConstruccion` (10–18, 25–32)

| Id | Campo multipart / salida |
|----|--------------------------|
| 10 | `constanciaAlineamiento` |
| 11 | `LicenciaUsoSuelo` (archivo) |
| 12 | `PlanoAutorizado` (archivo) |
| 13 | `LicenciaFraccionamiento` (archivo) |
| 14 | `ConstanciaPropietario` |
| 15 | `Factibilidad` |
| 16 | `RecibosImpuestoPredial` |
| 17 | `JuegoDePlanosArquitectonicos1` |
| 18 | `otros` |
| 25 | `FirmaPropietario` |
| 26 | `FirmaDRO` |
| 27 | `FirmaCorresponsable` |
| 28 | `FirmaResponsableRecepcionDocumento` |
| 29 | `constanciaNumero` |
| 30 | Recibo Servicios Municipales (**sin** atributo nominal en GET) |
| 31 | `JuegoDePlanosArquitectonicos2` |
| 32 | `JuegoDePlanosArquitectonicos3` |

Fuente: `LC_FILE_TIPO_FOTO` / `LC_RESPONSE_PHOTO_MAP` en `licencia-construccion.constants.ts`.

---

## 6. Colisión dato vs archivo en GET

Indicadores tinyint PascalCase (`LicenciaUsoSuelo`, …) vs URLs camelCase (`licenciaUsoSuelo`, …). Misma idea en Licencias: `Estacionamiento` (dato) vs `estacionamiento` (archivo).

---

## 7. Seguridad y campos homónimos

### 7.1 Registros / monitoreo

- Guards: `JwtAuthGuard` + `RolesGuard`.
- Rol **4 / 3**: todos los registros · **2**: por `IdGrupo` (CapturistaVisita) · **1**: como capturista.

### 7.2 Usuarios

Ver §3.6. Distinto criterio que registros.

### 7.3 Campos que no deben mezclarse

| Campo público | Tabla | Flujo |
|---------------|--------|-------|
| `Catastro.Clave` | Catastro | PredioObra = 0 |
| `LicenciaConstruccion.ClaveCatastral` | LicenciaConstruccion | PredioObra = 1 |
| `Licencias.RazonSocial` | Licencias | PredioObra = 0 |
| `ProteccionCivil.RazonSocial` | ProteccionCivil | PredioObra = 0 |
| `Licencias.NombreComercial` | Licencias | Nombre comercial (≠ razón social) |
| `Licencias.Contacto` | Contactos (`IdRegistro`) | PredioObra = 0 |
| `Licencias.ContactoRepresentante` | ContactoRepresentante (`IdRegistro`) | PredioObra = 0 |

**Obsoleto (no usar):** `ProteccionCivil.ContactoRepresentante.*` → sustituido por `Licencias.ContactoRepresentante.*`.

No hay sincronización automática entre homónimos.

---

## 8. Decisiones de diseño

1. **No migraciones** en estas tareas: el backend se alinea al esquema existente.
2. **Un archivo = un IdTipoFoto** en LC.
3. **Actualización no destructiva** de rutas de fotos.
4. **GET no escribe** y no oculta fotos por el `PredioObra` actual.
5. Contrato público vigente de archivos LC: `LC_FILE_TIPO_FOTO` / `LC_RESPONSE_PHOTO_MAP`.
6. `ClaveCatastral` y claves similares se tratan como **texto** (ceros, guiones, separadores).
7. ContactoRepresentante: relación física por `IdRegistro`; agrupación lógica bajo Licencias.
8. Visibilidad de usuarios ≠ visibilidad de registros.

---

## 9. Pruebas

Suites: `registros`, `registros_actualizar`, `monitoreo`, `lc-archivos-post`, `licencias-fotos-transversales`, `usuarios.service.spec`, `registros-catalogos-post`.

```bash
npm run build
npx jest
```

---

## 10. Referencias de código

| Tema | Ubicación |
|------|-----------|
| Constantes LC | `src/registros/licencia-construccion.constants.ts` |
| Constantes Licencias / ContactoRepresentante | `src/registros/licencias.constants.ts` |
| POST | `src/registros/registros.service.ts` |
| PATCH | `src/registros_actualizar/registros-actualizar.service.ts` |
| Detalle GET | `src/monitoreo/monitoreo.service.ts` |
| DTO detalle LC | `src/registros/dto/registro-detalle-response.dto.ts` |
| Entidad Licencias | `src/entities/Licencias.ts` |
| Entidad ContactoRepresentante | `src/entities/ContactoRepresentante.ts` |
| Entidad LicenciaConstruccion | `src/entities/LicenciaConstruccion.ts` |
| JWT / me | `src/auth/jwt.strategy.ts`, `src/auth/auth.service.ts` |
| Visibilidad usuarios | `src/usuarios/usuarios.service.ts` |
