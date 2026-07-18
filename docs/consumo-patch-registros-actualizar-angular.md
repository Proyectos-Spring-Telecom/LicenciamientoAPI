# Consumir `PATCH /registros_actualizar` desde Angular

Guía práctica para actualizar parcialmente un registro desde Angular con `multipart/form-data`.

Relacionado: [Consumir `POST /registros`](./consumo-post-registros-angular.md) (creación).

## Endpoint

```http
PATCH /registros_actualizar
Content-Type: multipart/form-data
Authorization: Bearer {accessToken}
```

Respuesta exitosa: **HTTP 200**

---

## Reglas importantes

1. **No envíes JSON.** Todo va en `FormData` con campos planos.
2. **`idRegistro` es obligatorio** (en el body, no en la URL).
3. Las secciones usan **notación con puntos**, igual que el POST:
   - `Sapac.NumeroCuenta`
   - `Licencias.Contacto.Nombre`
   - `LicenciaConstruccion.Corresponsables[0].Id`
4. **No envíes `Estatus`.** El estatus solo cambia con `PATCH /registros/:idRegistro/estatus`.
5. Es un **PATCH parcial**:
   - Omite lo que no quieras cambiar.
   - `''`, `null` o solo espacios **no sobrescriben** datos existentes.
   - El valor **`0` sí es válido** (`TipoRegistro`, `PredioObra`, `Estacionamiento`, `TienePrograma`, superficies, etc.).
6. **`PredioObra` efectivo:**
   - Si envías `PredioObra` → se usa ese valor.
   - Si no lo envías → se usa el valor ya guardado en `Registros`.
7. Según el PredioObra efectivo:
   - `0` → Sapac / Catastro / Licencias / PC + fotos en tabla `Fotos`
   - `1` → LicenciaConstruccion / Corresponsables + firmas/documentos en `FotosLicenciaConstruccion`
8. Cambiar de flujo **no borra** información histórica del flujo contrario.
9. Archivos permitidos: **JPG / JPEG / PNG / PDF** (mismo tamaño máximo que el POST).
10. Placeholders como `sin registro` en `Correo` se ignoran (no fallan ni actualizan el correo).

---

## Campos raíz

| Campo | Obligatorio | Notas |
|------|-------------|--------|
| `idRegistro` | **Sí** | Entero ≥ 1 |
| `Registro` | No | Folio / identificador |
| `Latitud` / `Longitud` | No | number |
| `TipoRegistro` | No | `0` Local comercial, `1` Vivienda |
| `PredioObra` | No | `0` / `1` (si se omite, usa el almacenado) |
| `EntidadFederativa` … `CP` | No | Dirección |

---

## Flujo `PredioObra efectivo = 0`

### Textos (opcionales)

Solo envía los que quieras actualizar:

```text
Sapac.NumeroCuenta
Sapac.IdTipoServicio              → 1 = SM, 2 = SP
Catastro.Clave                    → string (no lo conviertas a number)
Licencias.NombreComercial
Licencias.TipoPersona             → 1 | 2
Licencias.Estacionamiento         → 0 | 1
Licencias.FechaHora               → ISO date-time
Licencias.Contacto.Nombre
Licencias.Contacto.Telefono
Licencias.Contacto.Correo         → email válido o vacío / placeholder
ProteccionCivil.EsEmpresa         → 1 física, 2 moral
ProteccionCivil.TienePrograma     → 0 | 1
ProteccionCivil.ContactoRepresentante.Nombre
```

Si la sección no existe y envías al menos un valor útil → el backend **la crea**.  
Si no envías la sección → **no la toca**.

No envíes campos de `LicenciaConstruccion.*` en este flujo (se sanitizan).

### Archivos (máx. 1 por campo) → tabla `Fotos`

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

**Comportamiento de reemplazo (importante):**

- Se guarda el archivo **nuevo** en la misma carpeta `{idRegistro}/{idTipoFoto}/` con UUID nuevo.
- Si ya existía una fila `Fotos` para ese tipo → se **actualiza solo `Ruta`** (mismo `Id`).
- El archivo **anterior permanece en disco** (no se elimina).
- No se crean duplicados nuevos para el mismo tipo.

Si solo envías un archivo (p. ej. `Sapac.reciboSapac`) y PredioObra efectivo es `0`, es válido: se crea Sapac vacío si hace falta.

---

## Flujo `PredioObra efectivo = 1`

### Textos LicenciaConstruccion

```text
LicenciaConstruccion.TipoSolicitudLicencia   → 1|2|3|4
LicenciaConstruccion.DescripcionProyecto
LicenciaConstruccion.SuperficieTerrenoM2     → decimal (0 válido)
LicenciaConstruccion.NombrePropietario
LicenciaConstruccion.Fecha                   → date-time ISO
```

### Corresponsables

```text
LicenciaConstruccion.Corresponsables[0].Id
LicenciaConstruccion.Corresponsables[0].NombreCompleto
LicenciaConstruccion.Corresponsables[0].NoRegLicenciaConstruccion
LicenciaConstruccion.Corresponsables[0].CedulaProfesional
```

| Caso | Comportamiento |
|------|----------------|
| Con `Id` | Actualiza ese corresponsable (debe pertenecer a la LC del registro) |
| Sin `Id` + datos útiles | Crea uno nuevo |
| Omitido | **No se elimina** |
| Solo vacíos | Se ignora (no crea fila vacía) |

No envíes `IdLicenciaConstruccion` desde el cliente.

### Firmas (máx. 1) → `FotosLicenciaConstruccion`

| Campo form | IdTipoFoto |
|------------|------------|
| `LicenciaConstruccion.FirmaPropietario` | 25 |
| `LicenciaConstruccion.FirmaDRO` | 26 |
| `LicenciaConstruccion.FirmaCorresponsable` | 27 |
| `LicenciaConstruccion.FirmaResponsableRecepcionDocumento` | 28 |

### Documentos (múltiples por campo)

| Campo form | IdTipoFoto |
|------------|------------|
| `LicenciaConstruccion.constanciaAlineamientoyNumero` | 10 |
| `LicenciaConstruccion.LicenciaUsoyPlano` | 11 |
| `LicenciaConstruccion.ConstanciaPropietario` | 14 |
| `LicenciaConstruccion.Factibilidad` | 15 |
| `LicenciaConstruccion.RecibosImpuestoPredial` | 16 |
| `LicenciaConstruccion.JuegoDePlanosArquitectonicos` | 17 |
| `LicenciaConstruccion.otros` | 18 |

En el PATCH de construcción los archivos **se agregan** (no reemplazan ni borran los anteriores).

No envíes Sapac/Catastro/Licencias/PC en este flujo (se sanitizan).

---

## Servicio Angular

```typescript
// registros-actualizar-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface ActualizarRegistroResponse {
  status: string;
  message: string;
  data: {
    id: number;
    nombre: string;
    predioObra?: number | null;
    idSapac?: number | null;
    idCatastro?: number | null;
    idLicencia?: number | null;
    contacto?: { id: number } | null;
    idProteccionCivil?: number | null;
    contactoRepresentante?: { id: number } | null;
    idLicenciaConstruccion?: number | null;
    corresponsables?: Array<{
      id: number;
      nombreCompleto: string | null;
    }>;
    fotos?: Array<{
      id: number;
      idTipoFoto: number;
      ruta: string;
      accion?: 'creada' | 'actualizada';
    }>;
    fotosLicenciaConstruccion?: Array<{
      id: number;
      idTipoFoto: number;
      ruta: string;
    }>;
  };
}

@Injectable({ providedIn: 'root' })
export class RegistrosActualizarApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  actualizarRegistro(formData: FormData): Observable<ActualizarRegistroResponse> {
    // No pongas Content-Type manualmente: el browser agrega el boundary.
    return this.http.patch<ActualizarRegistroResponse>(
      `${this.baseUrl}/registros_actualizar`,
      formData,
    );
  }
}
```

El interceptor JWT es el mismo que para el resto de la API (`Authorization: Bearer …`).

---

## Armar el `FormData`

```typescript
// build-registro-actualizar-form-data.ts

type Scalar = string | number | null | undefined;
type FileInput = File | null | undefined;

/** Solo agrega valores útiles. No envíes '' si no quieres tocar el campo. */
function appendIfUseful(fd: FormData, key: string, value: Scalar): void {
  if (value === undefined || value === null) return;
  if (typeof value === 'string' && value.trim() === '') return;
  fd.append(key, String(value));
}

function appendFile(fd: FormData, key: string, file: FileInput): void {
  if (file) fd.append(key, file, file.name);
}

function appendFiles(
  fd: FormData,
  key: string,
  files: File[] | null | undefined,
): void {
  for (const file of files ?? []) {
    fd.append(key, file, file.name);
  }
}

export interface RegistroActualizarFormModel {
  idRegistro: number;
  Registro?: string | null;
  Latitud?: number | null;
  Longitud?: number | null;
  TipoRegistro?: 0 | 1 | null;
  PredioObra?: 0 | 1 | null;
  EntidadFederativa?: string | null;
  Municipio?: string | null;
  Localidad?: string | null;
  Colonia?: string | null;
  Calle?: string | null;
  NoInterior?: string | null;
  NoExterior?: string | null;
  CP?: string | null;

  // PredioObra = 0
  sapac?: Record<string, Scalar>;
  catastro?: Record<string, Scalar>;
  licencias?: Record<string, Scalar>;
  contacto?: Record<string, Scalar>;
  proteccionCivil?: Record<string, Scalar>;
  contactoRepresentante?: Record<string, Scalar>;
  archivosPredio0?: {
    'Sapac.reciboSapac'?: FileInput;
    'Sapac.caratulamedidor'?: FileInput;
    'Sapac.cuadromedidor'?: FileInput;
    'Catastro.reciboPredial'?: FileInput;
    'Licencias.licenciaFuncionamiento'?: FileInput;
    'Licencias.fachada'?: FileInput;
    'Licencias.estacionamiento'?: FileInput;
    'Licencias.bodega'?: FileInput;
    'ProteccionCivil.vistoBueno'?: FileInput;
  };

  // PredioObra = 1
  licenciaConstruccion?: Record<string, Scalar>;
  corresponsables?: Array<{
    Id?: number;
    NombreCompleto?: string;
    NoRegLicenciaConstruccion?: string;
    CedulaProfesional?: string;
  }>;
  firmas?: {
    'LicenciaConstruccion.FirmaPropietario'?: FileInput;
    'LicenciaConstruccion.FirmaDRO'?: FileInput;
    'LicenciaConstruccion.FirmaCorresponsable'?: FileInput;
    'LicenciaConstruccion.FirmaResponsableRecepcionDocumento'?: FileInput;
  };
  documentosLc?: {
    'LicenciaConstruccion.constanciaAlineamientoyNumero'?: File[];
    'LicenciaConstruccion.LicenciaUsoyPlano'?: File[];
    'LicenciaConstruccion.ConstanciaPropietario'?: File[];
    'LicenciaConstruccion.Factibilidad'?: File[];
    'LicenciaConstruccion.RecibosImpuestoPredial'?: File[];
    'LicenciaConstruccion.JuegoDePlanosArquitectonicos'?: File[];
    'LicenciaConstruccion.otros'?: File[];
  };
}

export function buildRegistroActualizarFormData(
  model: RegistroActualizarFormModel,
): FormData {
  const fd = new FormData();

  fd.append('idRegistro', String(model.idRegistro));

  appendIfUseful(fd, 'Registro', model.Registro);
  appendIfUseful(fd, 'Latitud', model.Latitud);
  appendIfUseful(fd, 'Longitud', model.Longitud);
  appendIfUseful(fd, 'TipoRegistro', model.TipoRegistro);
  appendIfUseful(fd, 'PredioObra', model.PredioObra);
  appendIfUseful(fd, 'EntidadFederativa', model.EntidadFederativa);
  appendIfUseful(fd, 'Municipio', model.Municipio);
  appendIfUseful(fd, 'Localidad', model.Localidad);
  appendIfUseful(fd, 'Colonia', model.Colonia);
  appendIfUseful(fd, 'Calle', model.Calle);
  appendIfUseful(fd, 'NoInterior', model.NoInterior);
  appendIfUseful(fd, 'NoExterior', model.NoExterior);
  appendIfUseful(fd, 'CP', model.CP);

  for (const [k, v] of Object.entries(model.sapac ?? {})) {
    appendIfUseful(fd, `Sapac.${k}`, v);
  }
  for (const [k, v] of Object.entries(model.catastro ?? {})) {
    appendIfUseful(fd, `Catastro.${k}`, v);
  }
  for (const [k, v] of Object.entries(model.licencias ?? {})) {
    appendIfUseful(fd, `Licencias.${k}`, v);
  }
  for (const [k, v] of Object.entries(model.contacto ?? {})) {
    appendIfUseful(fd, `Licencias.Contacto.${k}`, v);
  }
  for (const [k, v] of Object.entries(model.proteccionCivil ?? {})) {
    appendIfUseful(fd, `ProteccionCivil.${k}`, v);
  }
  for (const [k, v] of Object.entries(model.contactoRepresentante ?? {})) {
    appendIfUseful(fd, `ProteccionCivil.ContactoRepresentante.${k}`, v);
  }

  for (const [k, file] of Object.entries(model.archivosPredio0 ?? {})) {
    appendFile(fd, k, file as FileInput);
  }

  for (const [k, v] of Object.entries(model.licenciaConstruccion ?? {})) {
    appendIfUseful(fd, `LicenciaConstruccion.${k}`, v);
  }

  (model.corresponsables ?? []).forEach((c, i) => {
    appendIfUseful(fd, `LicenciaConstruccion.Corresponsables[${i}].Id`, c.Id);
    appendIfUseful(
      fd,
      `LicenciaConstruccion.Corresponsables[${i}].NombreCompleto`,
      c.NombreCompleto,
    );
    appendIfUseful(
      fd,
      `LicenciaConstruccion.Corresponsables[${i}].NoRegLicenciaConstruccion`,
      c.NoRegLicenciaConstruccion,
    );
    appendIfUseful(
      fd,
      `LicenciaConstruccion.Corresponsables[${i}].CedulaProfesional`,
      c.CedulaProfesional,
    );
  });

  for (const [k, file] of Object.entries(model.firmas ?? {})) {
    appendFile(fd, k, file as FileInput);
  }
  for (const [k, files] of Object.entries(model.documentosLc ?? {})) {
    appendFiles(fd, k, files as File[]);
  }

  return fd;
}
```

---

## Ejemplos de uso

### Solo actualizar dirección (PredioObra omitido)

```typescript
const fd = buildRegistroActualizarFormData({
  idRegistro: 10,
  Calle: 'C. San Cristóbal',
  NoExterior: '201',
  CP: '62230',
});

this.api.actualizarRegistro(fd).subscribe({
  next: (res) => console.log(res.data.id, res.data.predioObra),
  error: (err) => console.error(err.error),
});
```

### Flujo 0: datos Sapac + reemplazar recibo

```typescript
const fd = buildRegistroActualizarFormData({
  idRegistro: 10,
  PredioObra: 0,
  sapac: {
    NumeroCuenta: '01062026',
    IdTipoServicio: 1,
    Nombre: 'Abdiel',
  },
  archivosPredio0: {
    'Sapac.reciboSapac': this.reciboFile, // File del input
  },
});
```

### Flujo 1: actualizar LC + corresponsable existente + firma nueva

```typescript
const fd = buildRegistroActualizarFormData({
  idRegistro: 10,
  PredioObra: 1,
  licenciaConstruccion: {
    DescripcionProyecto: 'Ampliación de vivienda',
    TipoSolicitudLicencia: 2,
  },
  corresponsables: [
    { Id: 5, NombreCompleto: 'Arquitecto Actualizado' },
    { NombreCompleto: 'Arquitecto Nuevo', CedulaProfesional: '7654321' },
  ],
  firmas: {
    'LicenciaConstruccion.FirmaPropietario': this.firmaFile,
  },
});
```

### Solo archivo (válido si PredioObra almacenado = 0)

```typescript
const fd = buildRegistroActualizarFormData({
  idRegistro: 10,
  archivosPredio0: {
    'Licencias.fachada': this.fachadaFile,
  },
});
```

---

## Errores frecuentes

| Situación | Resultado |
|-----------|-----------|
| Sin `idRegistro` | 400 |
| Solo campos vacíos / sin archivos útiles | 400 |
| `Licencias.Tipo=sin registro` | 400 (`Tipo` es numérico) |
| Correo con `@` inválido | 400 |
| Correo `sin registro` (sin `@`) | Se ignora (OK) |
| Corresponsable `Id` inexistente | 404 |
| Corresponsable de otra LC | 400 |
| Archivo MIME no permitido | 400 |
| Firma enviada con PredioObra efectivo `0` | Se ignora; si no hay más cambios → 400 |
| Recibo SAPAC con PredioObra efectivo `1` | Se ignora |

---

## Checklist Angular

- [ ] Usar `FormData`, no `JSON.stringify`.
- [ ] No fijar `Content-Type` a mano.
- [ ] Enviar Bearer JWT.
- [ ] Incluir siempre `idRegistro`.
- [ ] No enviar `Estatus`.
- [ ] Omitir campos que no cambian (no mandar `''` para “limpiar”).
- [ ] Conservar `0` como string/número (`'0'` / `0`), no como `false`/`null`.
- [ ] Archivos con el **nombre exacto** del form (incluye prefijo `Sapac.` / `LicenciaConstruccion.`).
- [ ] En flujo 0, un archivo por campo; en documentos LC, varios con el mismo nombre de campo.
- [ ] Corresponsables: `Id` solo para actualizar; omitir = no borrar.

---

## Diferencias rápidas vs `POST /registros`

| | POST | PATCH actualizar |
|--|------|------------------|
| URL | `/registros` | `/registros_actualizar` |
| Método | POST (201) | PATCH (200) |
| `idRegistro` | No | **Obligatorio** |
| Campos raíz | Latitud/Longitud/Tipo/Predio **requeridos** | Todos opcionales excepto `idRegistro` |
| Secciones vacías | PO=0 siempre crea Sapac/Catastro/Licencias/PC | Solo crea si hay datos/archivos útiles |
| Fotos flujo 0 | Siempre crea filas nuevas | Crea o **actualiza Ruta** (mismo Id) |
| Archivo viejo | N/A | Se conserva en disco |
| Corresponsables `Id` | No se envía | Sí, para actualizar |
| `Estatus` | Backend fija 4 | **Nunca** se modifica |
