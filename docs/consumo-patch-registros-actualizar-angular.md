# Consumir `PATCH /registros_actualizar` desde Angular

Guía práctica para actualizar parcialmente un registro desde Angular con `multipart/form-data`.

Contrato completo: [contratos.md](./contratos.md) · Contexto: [contexto.md](./contexto.md) · POST: [consumo-post-registros-angular.md](./consumo-post-registros-angular.md)

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
3. Notación con puntos, igual que el POST.
4. **No envíes `Estatus`.** Solo cambia con `PATCH /registros/:idRegistro/estatus`.
5. Es un **PATCH parcial**:
   - Omite lo que no quieras cambiar.
   - `''`, `null` o solo espacios **no sobrescriben**.
   - El valor **`0` sí es válido**.
6. **`PredioObra` efectivo:**
   - Si envías `PredioObra` → se usa ese valor.
   - Si no → se usa el valor ya guardado.
7. Según PredioObra efectivo:
   - `0` → Sapac / Catastro / Licencias / PC + fotos en `Fotos`
   - `1` → LicenciaConstruccion / Corresponsables + archivos LC en `FotosLicenciaConstruccion`
8. **Transversales (solo archivos):** `Licencias.fachada|estacionamiento|bodega` se procesan con PredioObra efectivo `0` **y** `1`. Los datos textuales de Licencias/Contacto **solo** con efectivo `0`.
9. Cambiar de flujo **no borra** información histórica del flujo contrario.
10. Archivos: JPG / JPEG / PNG / PDF; **máx. 1 por campo**.
11. Placeholders como `sin registro` en `Correo` se ignoran (no fallan ni actualizan).

---

## Campos raíz

| Campo | Obligatorio | Notas |
|------|-------------|--------|
| `idRegistro` | **Sí** | Entero ≥ 1 |
| `Registro` | No | Folio |
| `Latitud` / `Longitud` | No | number |
| `TipoRegistro` | No | `0` / `1` |
| `PredioObra` | No | `0` / `1` (si se omite, usa el almacenado) |
| Dirección | No | |

---

## Flujo `PredioObra efectivo = 0`

### Textos (opcionales)

```text
Sapac.NumeroCuenta
Sapac.IdTipoServicio
Catastro.Clave
Licencias.NombreComercial
Licencias.Estacionamiento         → 0 | 1
Licencias.FechaHora               → ISO date-time (permitido, a diferencia de Sapac)
Licencias.Contacto.Nombre
Licencias.Contacto.Correo         → email válido o vacío / placeholder
ProteccionCivil.EsEmpresa         → 1 | 2
ProteccionCivil.TienePrograma     → 0 | 1
ProteccionCivil.ContactoRepresentante.Nombre
```

Si la sección no existe y envías un valor útil → el backend **la crea**.  
Si no envías la sección → **no la toca**.

### Archivos (máx. 1) → `Fotos`

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

**Reemplazo no destructivo:**

- Se guarda el archivo nuevo (UUID) en `{idRegistro}/{idTipoFoto}/`.
- Si ya existía fila `Fotos` para ese tipo → se **actualiza solo `Ruta`** (mismo `Id`).
- El archivo anterior **permanece en disco**.
- Respuesta: `accion: 'creada' | 'actualizada'`.

---

## Flujo `PredioObra efectivo = 1`

### Textos LicenciaConstruccion

```text
LicenciaConstruccion.TipoSolicitudLicencia   → 1|2|3|4
LicenciaConstruccion.DescripcionProyecto
LicenciaConstruccion.SuperficieTerrenoM2     → 0 válido
LicenciaConstruccion.NumeroExpediente
LicenciaConstruccion.NumeroControl
LicenciaConstruccion.SeguimientoObra         → string
LicenciaConstruccion.ConstanciaAlineamiento  → 0|1
LicenciaConstruccion.LicenciaUsoSuelo        → 0|1
LicenciaConstruccion.PlanoAutorizado         → 0|1
LicenciaConstruccion.LicenciaFraccionamiento → 0|1
LicenciaConstruccion.Otros                   → 0|1
```

(y el resto de escalares del POST)

### Corresponsables

```text
LicenciaConstruccion.Corresponsables[0].Id
LicenciaConstruccion.Corresponsables[0].NombreCompleto
LicenciaConstruccion.Corresponsables[0].NoRegLicenciaConstruccion
LicenciaConstruccion.Corresponsables[0].CedulaProfesional
```

| Caso | Comportamiento |
|------|----------------|
| Con `Id` | Actualiza (debe pertenecer a la LC del registro) |
| Sin `Id` + datos útiles | Crea |
| Omitido | **No se elimina** |
| Solo vacíos | Se ignora |

### Archivos LC (máx. 1) → `FotosLicenciaConstruccion`

Mismos 16 campos que el POST:

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

**Reemplazo:** si ya existe fila del mismo `IdLicenciaConstruccion + IdTipoFoto` → conservar `Id`, actualizar solo `Ruta`. No borrar archivo físico.  
Si no existe LC y llega un archivo → se crea LC mínima.

**Obsoletos:** `constanciaAlineamientoyNumero`, `LicenciaUsoyPlano`, `JuegoDePlanosArquitectonicos` (multi).

### Transversales con efectivo = 1

```text
Licencias.fachada | estacionamiento | bodega  → Fotos 6/7/8
```

Sí se procesan.  
`Licencias.NombreComercial`, Contacto, etc. → **se ignoran** (no se borran).

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
      accion?: 'creada' | 'actualizada';
    }>;
  };
}

@Injectable({ providedIn: 'root' })
export class RegistrosActualizarApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  actualizarRegistro(formData: FormData): Observable<ActualizarRegistroResponse> {
    return this.http.patch<ActualizarRegistroResponse>(
      `${this.baseUrl}/registros_actualizar`,
      formData,
    );
  }
}
```

---

## Armar el `FormData`

```typescript
// build-registro-actualizar-form-data.ts

type Scalar = string | number | null | undefined;
type FileInput = File | null | undefined;

function appendIfUseful(fd: FormData, key: string, value: Scalar): void {
  if (value === undefined || value === null) return;
  if (typeof value === 'string' && value.trim() === '') return;
  fd.append(key, String(value));
}

function appendFile(fd: FormData, key: string, file: FileInput): void {
  if (file) fd.append(key, file, file.name);
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

  licenciaConstruccion?: Record<string, Scalar>;
  corresponsables?: Array<{
    Id?: number;
    NombreCompleto?: string;
    NoRegLicenciaConstruccion?: string;
    CedulaProfesional?: string;
  }>;
  archivosLc?: {
    'LicenciaConstruccion.constanciaAlineamiento'?: FileInput;
    'LicenciaConstruccion.constanciaNumero'?: FileInput;
    'LicenciaConstruccion.LicenciaUsoSuelo'?: FileInput;
    'LicenciaConstruccion.PlanoAutorizado'?: FileInput;
    'LicenciaConstruccion.LicenciaFraccionamiento'?: FileInput;
    'LicenciaConstruccion.ConstanciaPropietario'?: FileInput;
    'LicenciaConstruccion.Factibilidad'?: FileInput;
    'LicenciaConstruccion.RecibosImpuestoPredial'?: FileInput;
    'LicenciaConstruccion.JuegoDePlanosArquitectonicos1'?: FileInput;
    'LicenciaConstruccion.JuegoDePlanosArquitectonicos2'?: FileInput;
    'LicenciaConstruccion.JuegoDePlanosArquitectonicos3'?: FileInput;
    'LicenciaConstruccion.otros'?: FileInput;
    'LicenciaConstruccion.FirmaPropietario'?: FileInput;
    'LicenciaConstruccion.FirmaDRO'?: FileInput;
    'LicenciaConstruccion.FirmaCorresponsable'?: FileInput;
    'LicenciaConstruccion.FirmaResponsableRecepcionDocumento'?: FileInput;
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
  for (const [k, file] of Object.entries(model.archivosLc ?? {})) {
    appendFile(fd, k, file as FileInput);
  }

  return fd;
}
```

---

## Ejemplos

### Solo dirección

```typescript
buildRegistroActualizarFormData({
  idRegistro: 10,
  Calle: 'C. San Cristóbal',
  NoExterior: '201',
});
```

### Flujo 0: Sapac + reemplazar recibo

```typescript
buildRegistroActualizarFormData({
  idRegistro: 10,
  PredioObra: 0,
  sapac: { NumeroCuenta: '01062026', IdTipoServicio: 1 },
  archivosPredio0: { 'Sapac.reciboSapac': this.reciboFile },
});
```

### Flujo 1: LC + archivo individual + fachada transversal

```typescript
buildRegistroActualizarFormData({
  idRegistro: 10,
  PredioObra: 1,
  licenciaConstruccion: {
    DescripcionProyecto: 'Ampliación',
    NumeroControl: 'CTRL-002',
    ConstanciaAlineamiento: 0,
  },
  corresponsables: [
    { Id: 5, NombreCompleto: 'Arquitecto Actualizado' },
    { NombreCompleto: 'Arquitecto Nuevo', CedulaProfesional: '7654321' },
  ],
  archivosLc: {
    'LicenciaConstruccion.PlanoAutorizado': this.planoFile,
    'LicenciaConstruccion.constanciaNumero': this.numeroOficialFile,
  },
  archivosPredio0: {
    // Transversal: válido aunque PredioObra efectivo = 1
    'Licencias.fachada': this.fachadaFile,
  },
});
```

### Solo archivo LC (PredioObra almacenado = 1)

```typescript
buildRegistroActualizarFormData({
  idRegistro: 10,
  archivosLc: {
    'LicenciaConstruccion.FirmaDRO': this.firmaFile,
  },
});
```

---

## Errores frecuentes

| Situación | Resultado |
|-----------|-----------|
| Sin `idRegistro` | 400 |
| Solo campos vacíos / sin archivos útiles | 400 |
| Correo con `@` inválido | 400 |
| Correo `sin registro` (sin `@`) | Se ignora (OK) |
| Corresponsable `Id` inexistente | 404 |
| Corresponsable de otra LC | 400 |
| Campos LC multi antiguos | 400 / no reconocidos |
| Recibo SAPAC con PredioObra efectivo `1` | Se ignora |
| Fachada con PredioObra efectivo `1` | Se procesa |

---

## Checklist Angular

- [ ] `FormData` + Bearer JWT; no fijar `Content-Type`.
- [ ] Siempre `idRegistro`; nunca `Estatus`.
- [ ] Omitir lo que no cambia; conservar `0`.
- [ ] Un archivo por campo LC (sin `multiple`).
- [ ] Nombres nuevos de planos / constanciaNumero.
- [ ] Corresponsables: `Id` solo para actualizar.
- [ ] Transversales 6/7/8 válidos con efectivo `1`; datos Licencias no.

---

## Diferencias rápidas vs `POST /registros`

| | POST | PATCH actualizar |
|--|------|------------------|
| URL | `/registros` | `/registros_actualizar` |
| Método | POST (201) | PATCH (200) |
| `idRegistro` | No | **Obligatorio** |
| Secciones vacías | PO=0 siempre crea Sapac/Catastro/Licencias/PC | Solo crea si hay datos/archivos útiles |
| Fotos | Crea filas | Crea o **actualiza Ruta** (mismo Id) |
| Archivo viejo | N/A | Se conserva en disco |
| Corresponsables `Id` | No | Sí, para actualizar |
| `Estatus` | Backend fija 4 | **Nunca** se modifica |
| Archivos LC | 16 campos individuales | Igual + reemplazo no destructivo |

---

## Referencia backend

- Controller: `src/registros_actualizar/registros-actualizar.controller.ts`
- Servicio: `src/registros_actualizar/registros-actualizar.service.ts`
- Constantes: `LC_FILE_TIPO_FOTO`, `LICENCIAS_TRANSVERSAL_FILE_FIELD_NAMES`
