# Contexto del backend — licenciasAPI (SIGMA)

Documento de contexto funcional y técnico. Resume lo implementado en los módulos de registros, actualización, monitoreo y detalle.

Stack: **NestJS 11**, **TypeORM 0.3**, **MySQL 8**, `multipart/form-data` (Multer), JWT + roles.

---

## 1. Propósito

API de captura y seguimiento de licencias municipales (predio / obra). Un registro (`Registros`) se bifurca por `PredioObra`:

| PredioObra | Significado | Secciones principales |
|------------|-------------|------------------------|
| `0` | No construcción / predio | Sapac, Catastro, Licencias (+ Contacto), ProteccionCivil (+ ContactoRepresentante), fotos en `Fotos` |
| `1` | En construcción | LicenciaConstruccion (+ Corresponsables), fotos en `FotosLicenciaConstruccion` |

Además existen **fotos transversales** de Licencias (`fachada`, `estacionamiento`, `bodega`) que se procesan en **ambos** valores de `PredioObra`.

---

## 2. Módulos relevantes

| Módulo | Responsabilidad |
|--------|-----------------|
| `src/registros/` | `POST /registros` (creación), listados, detalle, cambio de estatus |
| `src/registros_actualizar/` | `PATCH /registros_actualizar` (actualización parcial multipart) |
| `src/monitoreo/` | Listado y detalle con visibilidad por rol; el detalle es la fuente del mapper compartido |
| `src/dashboard/` | Métricas / captura por periodo |
| `src/entities/` | Entidades TypeORM (sin migraciones generadas desde estas tareas) |

**Detalle compartido:** `GET /registros/:idRegistro` delega en `MonitoreoService.findOne` (mismo contrato que `GET /monitoreo/:idRegistro`).

---

## 3. Funcionalidades implementadas

### 3.1 Creación — `POST /registros`

- Multipart plano con notación de puntos (`Sapac.NumeroCuenta`, `LicenciaConstruccion.Corresponsables[0].NombreCompleto`, etc.).
- `Estatus` fijo en `4`; `Registro` (folio) en `null`; capturista/grupo salen del JWT (`CapturistaVisita`).
- Flujo `PredioObra = 0`: crea Sapac/Catastro/Licencias/ProteccionCivil (aunque vengan vacíos); Contacto / ContactoRepresentante solo con datos útiles.
- Flujo `PredioObra = 1`: crea `LicenciaConstruccion` (constraint único por `IdRegistro`) + corresponsables + archivos LC.
- Archivos LC: **un campo multipart por `IdTipoFoto`**, `maxCount: 1`, fila en `FotosLicenciaConstruccion`.
- Escalares nuevos de LC: `NumeroExpediente`, `NumeroControl`, `SeguimientoObra` (varchar), indicadores tinyint `0|1` (`ConstanciaAlineamiento`, `LicenciaUsoSuelo`, …, `Otros`).
- Fotos transversales `Licencias.fachada|estacionamiento|bodega` se guardan aunque `PredioObra = 1` (tabla `Fotos`, tipos 6/7/8). El resto de datos de Licencias **sí** respeta PredioObra.

### 3.2 Actualización — `PATCH /registros_actualizar`

- Actualización **parcial**: `undefined` / `null` / `''` / solo espacios **no sobrescriben**; el valor `0` sí es válido.
- `idRegistro` obligatorio en el body. **No** se modifica `Estatus` (usar `PATCH /registros/:idRegistro/estatus`).
- `PredioObra efectivo`: body si viene; si no, el almacenado.
- Flujo 0: upsert de Sapac/Catastro/Licencias/PC + fotos en `Fotos` con reemplazo no destructivo (`IdRegistro + IdTipoFoto` → actualizar solo `Ruta`, conservar archivo físico).
- Flujo 1: upsert de LicenciaConstruccion / Corresponsables + archivos LC individuales con la misma regla en `FotosLicenciaConstruccion` (`IdLicenciaConstruccion + IdTipoFoto`).
- Corresponsables: con `Id` actualiza; sin `Id` crea; omitidos **no se borran**.
- Transversales: con PredioObra efectivo `1` se procesan solo `fachada`/`estacionamiento`/`bodega`; los atributos textuales de Licencias/Contacto se **ignoran** (no se borran).
- Colisión body/archivo: campos como `LicenciaConstruccion.LicenciaUsoSuelo` pueden ser tinyint en body y archivo multipart a la vez; el parser conserva el escalar cuando el nombre también es de archivo.

### 3.3 Lectura — detalle `GET /registros/:idRegistro` y `GET /monitoreo/:idRegistro`

- Misma respuesta (wrapper `{ data }`).
- Campos planos del registro + CapturistaVisita / capturista / supervisor / grupos + arreglo `fotos` (tipos **6, 7, 8**), **sin depender de PredioObra**.
- Si `PredioObra = 0`: anida Sapac, Catastro, Licencias, ProteccionCivil (con URLs de fotos 1–9 embebidas).
- Si `PredioObra = 1`: anida `LicenciaConstruccion` con escalares + Corresponsables + **16 URLs nominales** de `FotosLicenciaConstruccion` (o `null`).
- Duplicados históricos: se elige la fila de **Id mayor** por tipo; no se escribe en BD desde el GET.
- Nombres antiguos de salida **eliminados**: `constanciaAlineamientoyNumero`, `LicenciaUsoyPlano`, `JuegoDePlanosArquitectonicos` (arrays).

### 3.4 Otros endpoints de registros

- `GET /registros` — listado paginado con visibilidad por rol.
- `POST /registros/por-rango-fechas` — filtro por fechas.
- `PATCH /registros/:idRegistro/estatus` — cambio de estatus (roles 2/3/4).
- `GET /monitoreo` — listado plano (sin wrapper `data`).

---

## 4. Reglas transversales de archivos

### 4.1 Solo archivos (no datos) de Licencias

```text
Licencias.fachada         → IdTipoFoto 6
Licencias.estacionamiento → IdTipoFoto 7
Licencias.bodega          → IdTipoFoto 8
```

| PredioObra efectivo | Datos Licencias / Contacto | Archivos 6/7/8 |
|---------------------|----------------------------|----------------|
| `0` | Sí | Sí (si llegan) |
| `1` | No (se ignoran) | Sí (si llegan) |

Si el archivo no llega: no se toca la fila ni la ruta.

### 4.2 Reemplazo no destructivo (PATCH)

1. Guardar archivo nuevo (UUID, carpeta `{idRegistro}/{idTipoFoto}/`).
2. Buscar fila existente por clave de negocio.
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
| 29 | `constanciaNumero` (Número Oficial) |
| 30 | Recibo Servicios Municipales (**sin** atributo nominal en GET; ver contratos) |
| 31 | `JuegoDePlanosArquitectonicos2` |
| 32 | `JuegoDePlanosArquitectonicos3` |

Fuente única: `LC_FILE_TIPO_FOTO` en `licencia-construccion.constants.ts`.

---

## 6. Colisión dato vs archivo en respuesta GET

La tabla `LicenciaConstruccion` tiene indicadores tinyint con nombres PascalCase (`LicenciaUsoSuelo`, `PlanoAutorizado`, `LicenciaFraccionamiento`). En el mismo objeto de respuesta, las URLs de archivo se exponen en **camelCase** (`licenciaUsoSuelo`, `planoAutorizado`, `licenciaFraccionamiento`), misma convención que `Estacionamiento` (dato) vs `estacionamiento` (archivo) en Licencias.

Mapa de salida: `LC_RESPONSE_PHOTO_MAP`.

---

## 7. Seguridad y roles

- Guards: `JwtAuthGuard` + `RolesGuard`.
- Detalle / listados:
  - Rol **4 / 3**: todos los registros.
  - Rol **2**: registros de su `IdGrupo` (vía `CapturistaVisita`).
  - Rol **1**: registros donde figura como capturista.
- El detalle de fotos **no** cambia permisos.

---

## 8. Decisiones de diseño importantes

1. **No migraciones** en estas tareas: la BD ya tiene columnas/tablas; el backend se alinea al esquema.
2. **Un archivo = un IdTipoFoto** en LC (se eliminó el modelo multi-archivo / campos agrupados en el contrato activo de POST/PATCH/GET).
3. **Actualización no destructiva** de rutas: orphan files en disco son aceptables frente a complejidad de rollback.
4. **GET no escribe** y no oculta fotos existentes por el valor actual de `PredioObra`.
5. Constantes legacy (`LICENCIA_CONSTRUCCION_DOCUMENTO_TIPO_FOTO`, `FIRMA_TIPO_FOTO`, etc.) pueden permanecer en código por métodos de storage antiguos; el contrato público vigente es `LC_FILE_TIPO_FOTO` / `LC_RESPONSE_PHOTO_MAP`.

---

## 9. Pruebas

Suites relevantes: `registros`, `registros_actualizar`, `monitoreo`, `lc-archivos-post`, `licencias-fotos-transversales`.

Comandos:

```bash
npm run build
npx jest
```

---

## 10. Referencias de código

| Tema | Ubicación |
|------|-----------|
| Constantes LC archivos / GET | `src/registros/licencia-construccion.constants.ts` |
| Transversales Licencias | `src/registros/licencias.constants.ts` |
| POST create | `src/registros/registros.service.ts` |
| PATCH update | `src/registros_actualizar/registros-actualizar.service.ts` |
| Detalle GET | `src/monitoreo/monitoreo.service.ts` |
| DTO Swagger detalle | `src/registros/dto/registro-detalle-response.dto.ts` |
