# Contratos HTTP — licenciasAPI (SIGMA)

Contrato de API alineado al código vigente. Autenticación: `Authorization: Bearer {token}` en todos los endpoints listados (salvo que Swagger indique lo contrario).

Índice de contexto: [contexto.md](./contexto.md).

Última actualización: **2026-07-20**.

---

## 1. Endpoints

### 1.1 Registros / monitoreo / actualización

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/registros` | Crear registro (multipart) → **201** |
| `PATCH` | `/registros_actualizar` | Actualizar parcialmente (multipart) → **200** |
| `GET` | `/registros/:idRegistro` | Detalle completo → `{ data }` |
| `GET` | `/monitoreo/:idRegistro` | Detalle completo (mismo contrato que registros) |
| `GET` | `/registros` | Listado paginado |
| `GET` | `/monitoreo` | Listado plano (arreglo, sin wrapper) |
| `POST` | `/registros/por-rango-fechas` | Listado por rango de fechas |
| `PATCH` | `/registros/:idRegistro/estatus` | Cambiar estatus |

### 1.2 Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/login` | Inicio de sesión (actualiza `UltimoLogin`) |
| `POST` | `/login/refresh` | Renovar access token |
| `POST` | `/login/logout` | Cerrar sesión (revocar refresh) |
| `GET` | `/login/me` | Perfil del usuario autenticado |
| `POST` | `/login/usuario/recuperar/acceso` | Recuperación de acceso |
| `POST` | `/login/cambiar/accesso` | Cambio de acceso (flujo de recuperación) |

### 1.3 Usuarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/usuarios/list` | Lista completa (visibilidad por rol JWT) |
| `GET` | `/usuarios/list/grupo/:id` | Usuarios activos por grupo (visibilidad JWT) |
| `GET` | `/usuarios/:page/:limit` | Lista paginada (visibilidad JWT; `total` filtrado) |
| `GET` | `/usuarios/:id` | Usuario por ID (**sin** filtro de visibilidad) |
| `POST` | `/usuarios` | Crear usuario |
| `PATCH` | `/usuarios/:id` | Actualizar datos |
| `PATCH` | `/usuarios/estatus/:id` | Alternar estatus |
| `PATCH` | `/usuarios/actualizar/contrasena/:id` | Cambiar contraseña |

### 1.4 Roles

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/roles/list` | Roles activos (módulo `@Roles(4)`; sin filtro adicional por rol del token) |
| `GET` | `/roles/:page/:limit` | Roles paginados |
| `GET` | `/roles/:id` | Rol por ID (+ permisos) |
| `POST` | `/roles` | Crear rol |
| `PATCH` | `/roles/estatus/:id` | Alternar estatus |

---

## 2. Multipart — reglas comunes

1. Content-Type: `multipart/form-data` (no JSON).
2. Campos planos con notación de puntos / índices.
3. Valores `0` son válidos; no convertir a `boolean` ni a `null`.
4. Archivos: JPG / JPEG / PNG / PDF; **máximo 1 archivo por campo** de LC y de fotos flujo 0.
5. Prefijos de sección: `Sapac.`, `Catastro.`, `Licencias.`, `Licencias.Contacto.`, `ProteccionCivil.`, `ProteccionCivil.ContactoRepresentante.`, `LicenciaConstruccion.`, `LicenciaConstruccion.Corresponsables[i].`.

### PredioObra efectivo

| Endpoint | Cómo se determina |
|----------|-------------------|
| POST | Campo obligatorio `PredioObra` del body |
| PATCH | Body si viene; si no, valor almacenado en `Registros` |

---

## 3. `POST /registros`

### 3.1 Raíz (obligatorios parciales)

| Campo | Obligatorio | Valores |
|-------|-------------|---------|
| `Latitud` | Sí | number |
| `Longitud` | Sí | number |
| `TipoRegistro` | Sí | `0` Local comercial, `1` Vivienda |
| `PredioObra` | Sí | `0` / `1` |
| Dirección (`EntidadFederativa` … `CP`) | No | string |

No enviar: `Estatus`, `Registro` (folio), `IdCapturista`, `IdGrupo`.

### 3.2 PredioObra = 0 — textos

Secciones opcionales: `Sapac.*`, `Catastro.*`, `Licencias.*`, `Licencias.Contacto.*`, `ProteccionCivil.*`, `ProteccionCivil.ContactoRepresentante.*`.

El backend **siempre crea** Sapac, Catastro, Licencias y ProteccionCivil. Contactos solo con datos útiles.

`Catastro.Clave` es independiente de `LicenciaConstruccion.ClaveCatastral`.

### 3.3 PredioObra = 0 — archivos → tabla `Fotos`

| Campo form | IdTipoFoto |
|------------|------------|
| `Licencias.licenciaFuncionamiento` | 1 |
| `Catastro.reciboPredial` | 2 |
| `Sapac.reciboSapac` | 3 |
| `Sapac.caratulamedidor` | 4 |
| `Sapac.cuadromedidor` | 5 |
| `Licencias.fachada` | 6 |
| `Licencias.estacionamiento` | 7 |
| `Licencias.bodega` | 8 |
| `ProteccionCivil.vistoBueno` | 9 |

### 3.4 PredioObra = 1 — textos LicenciaConstruccion

```text
LicenciaConstruccion.TipoSolicitudLicencia     → 1|2|3|4
LicenciaConstruccion.DescripcionProyecto
LicenciaConstruccion.SuperficieTerrenoM2
LicenciaConstruccion.SuperficieTerrenoObraM2
LicenciaConstruccion.DescripcionSistemaConstructivo
LicenciaConstruccion.NombrePropietario
LicenciaConstruccion.DomicilioNotificacion
LicenciaConstruccion.RFC
LicenciaConstruccion.NombreDRO
LicenciaConstruccion.NoRegLicenciaConstruccion
LicenciaConstruccion.CedulaProfesional
LicenciaConstruccion.Fecha
LicenciaConstruccion.NumeroExpediente          → string max 50
LicenciaConstruccion.NumeroControl             → string max 50
LicenciaConstruccion.SeguimientoObra           → string max 50 (no es indicador)
LicenciaConstruccion.ClaveCatastral            → string max 100 | null (texto; no numérico)
LicenciaConstruccion.ConstanciaAlineamiento    → 0|1
LicenciaConstruccion.LicenciaUsoSuelo          → 0|1
LicenciaConstruccion.PlanoAutorizado           → 0|1
LicenciaConstruccion.LicenciaFraccionamiento   → 0|1
LicenciaConstruccion.Escrituras                → 0|1
LicenciaConstruccion.FactibilidadAguaPotable   → 0|1
LicenciaConstruccion.RecibosPagoPredial        → 0|1
LicenciaConstruccion.RecibosMunicipales        → 0|1
LicenciaConstruccion.PlanoArquitectonicos      → 0|1
LicenciaConstruccion.Otros                     → 0|1
```

**`ClaveCatastral`:** opcional; trim; vacío/`null` → no se guarda (queda `NULL`). Conserva ceros iniciales, guiones y separadores. Solo aplica con `PredioObra = 1`.

Corresponsables (sin `Id`):

```text
LicenciaConstruccion.Corresponsables[0].NombreCompleto
LicenciaConstruccion.Corresponsables[0].NoRegLicenciaConstruccion
LicenciaConstruccion.Corresponsables[0].CedulaProfesional
```

### 3.5 PredioObra = 1 — archivos → `FotosLicenciaConstruccion`

Cada campo: **máximo 1 archivo**. Nombres antiguos multi-archivo **no** forman parte del contrato activo.

| Campo form | IdTipoFoto |
|------------|------------|
| `LicenciaConstruccion.constanciaAlineamiento` | 10 |
| `LicenciaConstruccion.constanciaNumero` | 29 |
| `LicenciaConstruccion.LicenciaUsoSuelo` | 11 |
| `LicenciaConstruccion.PlanoAutorizado` | 12 |
| `LicenciaConstruccion.LicenciaFraccionamiento` | 13 |
| `LicenciaConstruccion.ConstanciaPropietario` | 14 |
| `LicenciaConstruccion.Factibilidad` | 15 |
| `LicenciaConstruccion.RecibosImpuestoPredial` | 16 |
| `LicenciaConstruccion.JuegoDePlanosArquitectonicos1` | 17 |
| `LicenciaConstruccion.JuegoDePlanosArquitectonicos2` | 31 |
| `LicenciaConstruccion.JuegoDePlanosArquitectonicos3` | 32 |
| `LicenciaConstruccion.otros` | 18 |
| `LicenciaConstruccion.FirmaPropietario` | 25 |
| `LicenciaConstruccion.FirmaDRO` | 26 |
| `LicenciaConstruccion.FirmaCorresponsable` | 27 |
| `LicenciaConstruccion.FirmaResponsableRecepcionDocumento` | 28 |

**Nota:** `LicenciaUsoSuelo` / `PlanoAutorizado` / `LicenciaFraccionamiento` pueden enviarse como escalar `0|1` **y** como archivo en el mismo request (colisión de nombre multipart).

### 3.6 Transversales en POST

Con `PredioObra = 1` se aceptan `Licencias.fachada|estacionamiento|bodega` → `Fotos` 6/7/8.  
No se procesan el resto de atributos de Licencias.

### 3.7 Respuesta 201 (forma)

```json
{
  "status": "success",
  "message": "Registro creado correctamente",
  "data": {
    "id": 25,
    "nombre": "",
    "idCapturistaVisita": 12,
    "idSapac": 8,
    "idCatastro": 5,
    "idLicencia": 9,
    "contacto": { "id": 3 },
    "idProteccionCivil": 4,
    "contactoRepresentante": null,
    "fotos": [{ "id": 100, "idTipoFoto": 6, "ruta": "https://..." }],
    "idLicenciaConstruccion": null,
    "corresponsables": [],
    "fotosLicenciaConstruccion": []
  }
}
```

---

## 4. `PATCH /registros_actualizar`

### 4.1 Reglas de parcialidad

- Obligatorio: `idRegistro` (≥ 1).
- Omitir lo que no cambia.
- `''` / `null` / espacios → **no** sobrescriben.
- `0` sí actualiza.
- **No** enviar `Estatus`.
- Cambiar de flujo PredioObra **no borra** datos del otro flujo.
- Solo `LicenciaConstruccion.ClaveCatastral` con valor útil y PredioObra efectivo = 1 cuenta como cambio válido.

### 4.2 PredioObra efectivo = 0

Textos: mismos prefijos que el POST (solo campos a actualizar).  
Archivos: misma tabla de tipos 1–9; reemplazo no destructivo de `Fotos.Ruta`.

Si llega solo un archivo (p. ej. `Sapac.reciboSapac`) y no existe Sapac → se crea Sapac mínimo.

`LicenciaConstruccion.ClaveCatastral` (y el resto de LC) se **ignora**; no se borra valor histórico.

### 4.3 PredioObra efectivo = 1

Textos: `LicenciaConstruccion.*` (incluye `ClaveCatastral`) + corresponsables indexados.

| Corresponsable | Comportamiento |
|----------------|----------------|
| Con `Id` | Actualiza (debe pertenecer a la LC del registro) |
| Sin `Id` + datos útiles | Crea |
| Omitido | No se elimina |
| Solo vacíos | Se ignora |

Archivos LC: **mismos 16 campos individuales** que el POST (`maxCount: 1`).  
Reemplazo: `IdLicenciaConstruccion + IdTipoFoto` → conservar `Id`, actualizar `Ruta`; no borrar archivo físico.  
Respuesta de fotos LC incluye `accion: 'creada' | 'actualizada'`.

### 4.4 Transversales en PATCH

| PredioObra efectivo | Licencias / Contacto (datos) | fachada / estacionamiento / bodega |
|---------------------|------------------------------|------------------------------------|
| `0` | Procesar | Procesar si llegan |
| `1` | Ignorar (no borrar) | Procesar si llegan → `Fotos` |

Otros archivos de flujo 0 (`Sapac.*`, `Catastro.*`, `vistoBueno`, `licenciaFuncionamiento`) con PredioObra efectivo `1` se descartan.

### 4.5 Respuesta 200 (forma)

```json
{
  "status": "success",
  "message": "Registro actualizado correctamente",
  "data": {
    "id": 10,
    "nombre": "",
    "predioObra": 1,
    "idSapac": null,
    "idCatastro": null,
    "idLicencia": null,
    "contacto": null,
    "idProteccionCivil": null,
    "contactoRepresentante": null,
    "idLicenciaConstruccion": 20,
    "corresponsables": [{ "id": 5, "nombreCompleto": "Arq Uno" }],
    "fotosLicenciaConstruccion": [
      {
        "id": 100,
        "idTipoFoto": 12,
        "ruta": "https://.../10/12/uuid.pdf",
        "accion": "actualizada"
      }
    ],
    "fotos": [
      {
        "id": 200,
        "idTipoFoto": 6,
        "ruta": "https://.../10/6/uuid.jpg",
        "accion": "creada"
      }
    ]
  }
}
```

---

## 5. Detalle — `GET /registros/:idRegistro` y `GET /monitoreo/:idRegistro`

Ambos devuelven `{ data: … }` con el **mismo mapper** (`MonitoreoService.findOne`).

### 5.1 Siempre presentes (camelCase)

Campos de `Registros` + visita/capturista/supervisor/grupos +:

```json
"fotos": [
  { "id": 61, "idRegistro": 50, "ruta": "https://...", "fechaHora": null, "idTipoFoto": 6 }
]
```

Solo tipos **6, 7, 8** en este arreglo. Independiente de `PredioObra`. Vacío `[]` si no hay.

### 5.2 Si `predioObra === 0`

Objetos anidados: `Sapac`, `Catastro`, `Licencias`, `ProteccionCivil` (pueden ser `null`).  
URLs embebidas: `reciboSapac`, `caratulamedidor`, `cuadromedidor`, `reciboPredial`, `licenciaFuncionamiento`, `fachada`, `estacionamiento`, `bodega`, `vistoBueno` → `string | null`.

`Catastro.Clave` puede coexistir en la respuesta con `LicenciaConstruccion.ClaveCatastral` en otros registros; son campos distintos.

### 5.3 Si `predioObra === 1`

```json
"LicenciaConstruccion": null
```

o un objeto con:

**Escalares (datos de tabla):** `Id`, `TipoSolicitudLicencia`, …, `NumeroExpediente`, `NumeroControl`, `SeguimientoObra`, **`ClaveCatastral`** (`string | null`; no omitir si es `NULL` en BD), indicadores PascalCase (`ConstanciaAlineamiento`, `LicenciaUsoSuelo`, `PlanoAutorizado`, …, `Otros`), `Corresponsables[]`.

**URLs de archivo (siempre presentes, `string | null`):**

| Propiedad de respuesta | IdTipoFoto |
|------------------------|------------|
| `constanciaAlineamiento` | 10 |
| `constanciaNumero` | 29 |
| `licenciaUsoSuelo` | 11 |
| `planoAutorizado` | 12 |
| `licenciaFraccionamiento` | 13 |
| `ConstanciaPropietario` | 14 |
| `Factibilidad` | 15 |
| `RecibosImpuestoPredial` | 16 |
| `JuegoDePlanosArquitectonicos1` | 17 |
| `JuegoDePlanosArquitectonicos2` | 31 |
| `JuegoDePlanosArquitectonicos3` | 32 |
| `otros` | 18 |
| `FirmaPropietario` | 25 |
| `FirmaDRO` | 26 |
| `FirmaCorresponsable` | 27 |
| `FirmaResponsableRecepcionDocumento` | 28 |

Fuente: `LC_RESPONSE_PHOTO_MAP`. La ruta se toma de `FotosLicenciaConstruccion.Ruta` (URL completa almacenada; no se reconstruye).

**No devolver:** `constanciaAlineamientoyNumero`, `LicenciaUsoyPlano`, `JuegoDePlanosArquitectonicos` (arrays).

**Duplicados:** Id mayor por `IdTipoFoto`.

**Tipo 30** (Recibo Servicios Municipales): existe en catálogo; **no** tiene atributo nominal en este contrato. No se inventa nombre.

### 5.4 Ejemplo conceptual PredioObra = 1

```json
{
  "data": {
    "id": 50,
    "registro": "REG-000050",
    "predioObra": 1,
    "fotos": [
      { "id": 1, "idTipoFoto": 6, "ruta": "https://.../50/6/fachada.jpg" }
    ],
    "LicenciaConstruccion": {
      "Id": 20,
      "TipoSolicitudLicencia": 1,
      "DescripcionProyecto": "Construcción de vivienda",
      "ClaveCatastral": "1100-01-002-003",
      "LicenciaUsoSuelo": 1,
      "PlanoAutorizado": 0,
      "Corresponsables": [],
      "constanciaAlineamiento": "https://.../50/10/a.pdf",
      "constanciaNumero": null,
      "licenciaUsoSuelo": "https://.../50/11/b.pdf",
      "planoAutorizado": null,
      "licenciaFraccionamiento": null,
      "ConstanciaPropietario": null,
      "Factibilidad": null,
      "RecibosImpuestoPredial": null,
      "JuegoDePlanosArquitectonicos1": "https://.../50/17/p1.pdf",
      "JuegoDePlanosArquitectonicos2": "https://.../50/31/p2.pdf",
      "JuegoDePlanosArquitectonicos3": null,
      "otros": null,
      "FirmaPropietario": "https://.../50/25/f.png",
      "FirmaDRO": null,
      "FirmaCorresponsable": null,
      "FirmaResponsableRecepcionDocumento": null
    }
  }
}
```

Obsérvese la coexistencia: `LicenciaUsoSuelo: 1` (tinyint) y `licenciaUsoSuelo: "https://..."` (archivo).

---

## 6. Autenticación — contratos clave

### 6.1 JWT / `request.user` (`AuthenticatedUser`)

```ts
{
  userId: number;
  email: string;
  idGrupo: number | null;
  rol: number | null;
}
```

Origen: access token (`id`, `email`, `idGrupo`, `rol`, `type: 'access'`).

### 6.2 `GET /login/me`

```json
{
  "id": 1,
  "nombre": "...",
  "apellidoPaterno": "...",
  "apellidoMaterno": "...",
  "nombreCompleto": "...",
  "UserName": "correo@dominio",
  "PhoneNumber": "5512345678",
  "permisos": ["1", "2"],
  "logo": null,
  "nombreRol": "...",
  "nombreGrupo": "...",
  "ultimoLogin": "2026-07-20T18:00:00.000Z"
}
```

---

## 7. Usuarios — visibilidad GET

Alcance según **rol del JWT** (no según filtros del cliente):

| Rol token | List / paginado | Por grupo (`/list/grupo/:id`) | Por ID (`/:id`) |
|-----------|-----------------|-------------------------------|-----------------|
| 4 | Todos | Cualquier grupo | Sin filtro de alcance |
| 3 | Todos excepto `IdRol = 4` | Cualquier grupo, excepto usuarios rol 4 | Sin filtro de alcance |
| 2 | `IdGrupo = token` y `IdRol <> 4` | Solo si `:id` = grupo del token; si no → **403** | Sin filtro de alcance |
| 1 | **403** | **403** | Sin filtro de alcance (JWT válido) |
| 2 sin grupo | **403** | **403** | — |

Relación real: `Usuarios.IdRol` (un rol) y `Usuarios.IdGrupo` (un grupo).

Paginación: `paginated.total` = solo usuarios visibles.

---

## 8. Campos de contrato obsoletos (no usar)

| Nombre antiguo | Sustituto |
|----------------|-----------|
| `LicenciaConstruccion.constanciaAlineamientoyNumero` (multi) | `constanciaAlineamiento` (10) + `constanciaNumero` (29) |
| `LicenciaConstruccion.LicenciaUsoyPlano` (multi) | `LicenciaUsoSuelo` (11) + `PlanoAutorizado` (12) |
| `LicenciaConstruccion.JuegoDePlanosArquitectonicos` (multi) | `JuegoDePlanosArquitectonicos1\|2\|3` (17, 31, 32) |

---

## 9. Referencia Swagger

- POST / PATCH registros: esquemas en controladores (`registros.controller.ts`, `registros-actualizar.controller.ts`), incluye `LicenciaConstruccion.ClaveCatastral`.
- GET detalle: `RegistroDetalleResponseDto` / `RegistroDetalleLicenciaConstruccionDto` en `src/registros/dto/registro-detalle-response.dto.ts` (reutilizado por monitoreo).
- Usuarios / roles / login: descripciones de visibilidad y respuestas 401/403 en sus controladores.

---

## 10. Guías de consumo cliente

- [consumo-post-registros-angular.md](./consumo-post-registros-angular.md)
- [consumo-patch-registros-actualizar-angular.md](./consumo-patch-registros-actualizar-angular.md)
