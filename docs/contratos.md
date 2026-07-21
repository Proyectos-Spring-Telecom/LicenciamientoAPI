# Contratos HTTP — licenciasAPI (SIGMA)

Contrato de API alineado al código vigente. Autenticación: `Authorization: Bearer {token}` (salvo que Swagger indique lo contrario).

Índice de contexto: [contexto.md](./contexto.md).

Última actualización: **2026-07-21**.

---

## 1. Endpoints

### 1.1 Registros / monitoreo / actualización

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/registros` | Crear registro (multipart) → **201** |
| `PATCH` | `/registros_actualizar` | Actualizar parcialmente (multipart) → **200** |
| `GET` | `/registros/:idRegistro` | Detalle completo → `{ data }` |
| `GET` | `/monitoreo/:idRegistro` | Detalle completo (mismo contrato) |
| `GET` | `/registros` | Listado paginado |
| `GET` | `/monitoreo` | Listado plano (arreglo) |
| `POST` | `/registros/por-rango-fechas` | Por rango de fechas |
| `PATCH` | `/registros/:idRegistro/estatus` | Cambiar estatus |

### 1.2 Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/login` | Login (actualiza `UltimoLogin`) |
| `POST` | `/login/refresh` | Renovar access token |
| `POST` | `/login/logout` | Cerrar sesión |
| `GET` | `/login/me` | Perfil autenticado |
| `POST` | `/login/usuario/recuperar/acceso` | Recuperación |
| `POST` | `/login/cambiar/accesso` | Cambio de acceso |

### 1.3 Usuarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/usuarios/list` | Lista (visibilidad JWT) |
| `GET` | `/usuarios/list/grupo/:id` | Por grupo (visibilidad JWT) |
| `GET` | `/usuarios/:page/:limit` | Paginado (total filtrado) |
| `GET` | `/usuarios/:id` | Por ID (**sin** filtro de alcance) |
| `POST` | `/usuarios` | Crear |
| `PATCH` | `/usuarios/:id` | Actualizar |
| `PATCH` | `/usuarios/estatus/:id` | Alternar estatus |
| `PATCH` | `/usuarios/actualizar/contrasena/:id` | Contraseña |

### 1.4 Roles

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/roles/list` | Activos (`@Roles(4)`) |
| `GET` | `/roles/:page/:limit` | Paginado |
| `GET` | `/roles/:id` | Por ID (+ permisos) |
| `POST` | `/roles` | Crear |
| `PATCH` | `/roles/estatus/:id` | Alternar estatus |

---

## 2. Multipart — reglas comunes

1. Content-Type: `multipart/form-data`.
2. Campos planos con notación de puntos / índices.
3. Valores `0` válidos (no convertir a `boolean`/`null`).
4. Archivos: JPG / JPEG / PNG / PDF; **máx. 1 por campo**.
5. Prefijos: `Sapac.`, `Catastro.`, `Licencias.`, `Licencias.Contacto.`, `Licencias.ContactoRepresentante.`, `ProteccionCivil.`, `LicenciaConstruccion.`, `LicenciaConstruccion.Corresponsables[i].`.

### PredioObra efectivo

| Endpoint | Determinación |
|----------|---------------|
| POST | `PredioObra` del body (obligatorio) |
| PATCH | `body.PredioObra ?? registro.PredioObra` |

---

## 3. `POST /registros`

### 3.1 Raíz

| Campo | Obligatorio | Valores |
|-------|-------------|---------|
| `Latitud` | Sí | number |
| `Longitud` | Sí | number |
| `TipoRegistro` | Sí | `0` Local comercial, `1` Vivienda |
| `PredioObra` | Sí | `0` / `1` |
| Dirección | No | string |

No enviar: `Estatus`, `Registro` (folio), `IdCapturista`, `IdGrupo`.

### 3.2 PredioObra = 0 — textos

Secciones: `Sapac.*`, `Catastro.*`, `Licencias.*`, `Licencias.Contacto.*`, `Licencias.ContactoRepresentante.*`, `ProteccionCivil.*`.

El backend **siempre crea** Sapac, Catastro, Licencias y ProteccionCivil. Contacto / ContactoRepresentante solo con datos útiles.

#### Licencias (escalares relevantes)

```text
Licencias.Registro
Licencias.NombreComercial
Licencias.Giro
Licencias.LicenciaSuelo
Licencias.NombrePropietario
Licencias.ApellidoPaternoPropietario
Licencias.ApellidoMaternoPropietario
Licencias.TipoPersona                  → 1|2
Licencias.RFC
Licencias.RazonSocial                  → string max 200 | null
Licencias.FechaExpedicion
Licencias.FechaRefrendo
Licencias.Estacionamiento              → 0|1
Licencias.Tipo
Licencias.FechaHora
```

**`Licencias.RazonSocial`:** opcional; trim; vacío → `NULL`. Independiente de `ProteccionCivil.RazonSocial` y de `NombreComercial`. No es transversal.

#### ContactoRepresentante

```text
Licencias.ContactoRepresentante.Nombre
Licencias.ContactoRepresentante.ApellidoPaterno
Licencias.ContactoRepresentante.ApellidoMaterno
Licencias.ContactoRepresentante.Telefono
Licencias.ContactoRepresentante.Correo
```

Tabla física: `ContactoRepresentante` (`IdRegistro`). **No** usar `ProteccionCivil.ContactoRepresentante.*`.

`Catastro.Clave` ≠ `LicenciaConstruccion.ClaveCatastral`.

### 3.3 PredioObra = 0 — archivos → `Fotos`

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
LicenciaConstruccion.SeguimientoObra           → string max 50
LicenciaConstruccion.ClaveCatastral            → string max 100 | null (texto)
LicenciaConstruccion.ConstanciaAlineamiento    → 0|1
… indicadores … Otros                          → 0|1
```

Corresponsables: `LicenciaConstruccion.Corresponsables[i].{NombreCompleto,NoRegLicenciaConstruccion,CedulaProfesional}`.

### 3.5 PredioObra = 1 — archivos → `FotosLicenciaConstruccion`

| Campo form | IdTipoFoto |
|------------|------------|
| `constanciaAlineamiento` | 10 |
| `constanciaNumero` | 29 |
| `LicenciaUsoSuelo` | 11 |
| `PlanoAutorizado` | 12 |
| `LicenciaFraccionamiento` | 13 |
| `ConstanciaPropietario` | 14 |
| `Factibilidad` | 15 |
| `RecibosImpuestoPredial` | 16 |
| `JuegoDePlanosArquitectonicos1\|2\|3` | 17, 31, 32 |
| `otros` | 18 |
| `FirmaPropietario` / `FirmaDRO` / `FirmaCorresponsable` / `FirmaResponsableRecepcionDocumento` | 25–28 |

Colisión: `LicenciaUsoSuelo` / `PlanoAutorizado` / `LicenciaFraccionamiento` pueden ser escalar `0|1` **y** archivo.

### 3.6 Transversales en POST

Con `PredioObra = 1` se aceptan `Licencias.fachada|estacionamiento|bodega`.  
No se procesan datos textuales de Licencias (incl. `RazonSocial`, Contacto, ContactoRepresentante).

### 3.7 Respuesta 201 (forma)

```json
{
  "status": "success",
  "message": "Registro creado correctamente",
  "data": {
    "id": 25,
    "idCapturistaVisita": 12,
    "idSapac": 8,
    "idCatastro": 5,
    "idLicencia": 9,
    "contacto": { "id": 3 },
    "idProteccionCivil": 4,
    "contactoRepresentante": { "id": 2 },
    "fotos": [{ "id": 100, "idTipoFoto": 6, "ruta": "https://..." }],
    "idLicenciaConstruccion": null,
    "corresponsables": [],
    "fotosLicenciaConstruccion": []
  }
}
```

---

## 4. `PATCH /registros_actualizar`

### 4.1 Parcialidad

- Obligatorio: `idRegistro`.
- Vacío / null / espacios → **no** sobrescriben; `0` sí.
- **No** enviar `Estatus`.
- Cambio de PredioObra **no borra** datos del otro flujo.
- Campos útiles en solitario (p. ej. solo `Licencias.RazonSocial` o solo `ClaveCatastral`) cuentan como cambio.

### 4.2 PredioObra efectivo = 0

Textos: mismos prefijos que el POST (`Licencias.RazonSocial`, `Licencias.ContactoRepresentante.*`, etc.).  
Archivos: tipos 1–9; reemplazo no destructivo.  
LC se ignora (no se borra histórico).

### 4.3 PredioObra efectivo = 1

Textos: `LicenciaConstruccion.*` (incluye `ClaveCatastral`) + corresponsables.  
Datos de Licencias (RazonSocial, Contacto, ContactoRepresentante) se **ignoran** (conservan históricos).  
Archivos LC: mismos 16 campos; `accion: 'creada' | 'actualizada'`.

### 4.4 Transversales

| PredioObra efectivo | Datos Licencias | fachada / estacionamiento / bodega |
|---------------------|-----------------|------------------------------------|
| `0` | Procesar | Sí si llegan |
| `1` | Ignorar (no borrar) | Sí si llegan → `Fotos` |

### 4.5 Respuesta 200 (forma)

```json
{
  "status": "success",
  "message": "Registro actualizado correctamente",
  "data": {
    "id": 10,
    "predioObra": 1,
    "idLicenciaConstruccion": 20,
    "corresponsables": [{ "id": 5, "nombreCompleto": "Arq Uno" }],
    "fotosLicenciaConstruccion": [
      { "id": 100, "idTipoFoto": 12, "ruta": "https://...", "accion": "actualizada" }
    ],
    "fotos": [
      { "id": 200, "idTipoFoto": 6, "ruta": "https://...", "accion": "creada" }
    ]
  }
}
```

---

## 5. Detalle — `GET /registros/:idRegistro` y `GET /monitoreo/:idRegistro`

Mismo mapper (`MonitoreoService.findOne`) → `{ data }`.

### 5.1 Siempre: `fotos` tipos 6, 7, 8 (independiente de PredioObra)

### 5.2 Si `predioObra === 0`

```json
{
  "Licencias": {
    "Id": 5,
    "NombreComercial": "Comercializadora Ejemplo",
    "TipoPersona": 2,
    "RFC": "ABC010101XYZ",
    "RazonSocial": "Comercializadora Ejemplo, S.A. de C.V.",
    "Contacto": { "Id": 1, "Nombre": "...", "Correo": "..." },
    "ContactoRepresentante": {
      "Id": 9,
      "Nombre": "Juan",
      "ApellidoPaterno": "Pérez",
      "ApellidoMaterno": "López",
      "Telefono": "7771234567",
      "Correo": "juan@example.com"
    },
    "fachada": "https://...",
    "estacionamiento": null,
    "bodega": null
  },
  "ProteccionCivil": {
    "RazonSocial": "Razón social registrada en Protección Civil",
    "vistoBueno": null
  }
}
```

- `Licencias` null si no hay fila (ni contacto/representante/fotos útiles).
- `RazonSocial: null` si la columna es NULL (no omitir si el mapper expone todos los escalares).
- `ProteccionCivil` **no** incluye `ContactoRepresentante`.

### 5.3 Si `predioObra === 1`

Escalares LC incluyen `ClaveCatastral` + indicadores + Corresponsables + 16 URLs (`LC_RESPONSE_PHOTO_MAP`).  
Tipo 30 sin atributo nominal. Duplicados → Id mayor.

### 5.4 Ejemplo PredioObra = 1 (extracto)

```json
{
  "data": {
    "id": 50,
    "predioObra": 1,
    "fotos": [{ "id": 1, "idTipoFoto": 6, "ruta": "https://..." }],
    "LicenciaConstruccion": {
      "Id": 20,
      "ClaveCatastral": "1100-01-002-003",
      "LicenciaUsoSuelo": 1,
      "licenciaUsoSuelo": "https://.../11/b.pdf",
      "Corresponsables": []
    }
  }
}
```

---

## 6. Autenticación

### 6.1 `AuthenticatedUser` (`request.user`)

```ts
{ userId: number; email: string; idGrupo: number | null; rol: number | null }
```

### 6.2 `GET /login/me`

Incluye: `UserName`, `PhoneNumber`, `permisos`, `nombreRol`, `nombreGrupo`, `ultimoLogin`.

---

## 7. Usuarios — visibilidad GET

| Rol token | List / paginado | Por grupo | Por ID |
|-----------|-----------------|-----------|--------|
| 4 | Todos | Cualquier | Sin filtro alcance |
| 3 | Excepto IdRol 4 | Excepto IdRol 4 | Sin filtro alcance |
| 2 | Mismo grupo y ≠ rol 4 | Solo su grupo; otro → 403 | Sin filtro alcance |
| 1 | 403 | 403 | Sin filtro alcance |

Paginación: `total` = solo visibles. Relación: `Usuarios.IdRol` / `Usuarios.IdGrupo`.

---

## 8. Campos de contrato obsoletos (no usar)

| Nombre antiguo | Sustituto |
|----------------|-----------|
| `ProteccionCivil.ContactoRepresentante.*` | `Licencias.ContactoRepresentante.*` |
| `LicenciaConstruccion.constanciaAlineamientoyNumero` (multi) | `constanciaAlineamiento` (10) + `constanciaNumero` (29) |
| `LicenciaConstruccion.LicenciaUsoyPlano` (multi) | `LicenciaUsoSuelo` (11) + `PlanoAutorizado` (12) |
| `LicenciaConstruccion.JuegoDePlanosArquitectonicos` (multi) | `JuegoDePlanosArquitectonicos1\|2\|3` (17, 31, 32) |

---

## 9. Swagger (referencia)

- POST/PATCH: controladores de registros; incluyen `Licencias.RazonSocial`, `Licencias.ContactoRepresentante.*`, `LicenciaConstruccion.ClaveCatastral`.
- GET detalle: `RegistroDetalleLicenciaConstruccionDto` (+ mapper de Licencias en monitoreo).
- Usuarios / roles / login: visibilidad y 401/403 en sus controladores.

---

## 10. Guías de consumo cliente

- [consumo-post-registros-angular.md](./consumo-post-registros-angular.md)
- [consumo-patch-registros-actualizar-angular.md](./consumo-patch-registros-actualizar-angular.md)
