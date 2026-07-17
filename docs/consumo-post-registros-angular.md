# Consumir `POST /registros` desde Angular

Guía práctica para crear un registro desde Angular usando `multipart/form-data`, igual que Flutter / Swagger.

## Endpoint

```http
POST /registros
Content-Type: multipart/form-data
Authorization: Bearer {accessToken}
```

Respuesta exitosa: **HTTP 201**

---

## Reglas importantes

1. **No envíes JSON.** Todo va en `FormData` con campos planos.
2. Las secciones usan **notación con puntos**:
   - `Sapac.NumeroCuenta`
   - `Licencias.Contacto.Nombre`
   - `LicenciaConstruccion.Corresponsables[0].NombreCompleto`
3. **No envíes** `IdCapturista` ni `IdGrupo`: salen del JWT.
4. **No envíes** `Estatus` ni `Registro`: el backend fija `Estatus=4` y `Registro=null`.
5. `PredioObra` define el flujo:
   - `0` → Sapac, Catastro, Licencias, ProteccionCivil (+ fotos)
   - `1` → LicenciaConstruccion, corresponsables, firmas y documentos
6. Archivos permitidos: **JPG / JPEG / PNG / PDF**.
7. Valores `0` son válidos (`TipoRegistro`, `PredioObra`, etc.). No los conviertas a `null` ni a `boolean`.

---

## Campos raíz (siempre)

| Campo | Obligatorio | Valores |
|------|-------------|---------|
| `Latitud` | Sí | number |
| `Longitud` | Sí | number |
| `TipoRegistro` | Sí | `0` Local comercial, `1` Vivienda |
| `PredioObra` | Sí | `0` No construcción, `1` En construcción |
| `EntidadFederativa` | No | string |
| `Municipio` | No | string |
| `Localidad` | No | string |
| `Colonia` | No | string |
| `Calle` | No | string |
| `NoInterior` | No | string |
| `NoExterior` | No | string |
| `CP` | No | string (conserva ceros) |

---

## Flujo `PredioObra = 0`

### Textos (opcionales)

Prefijos: `Sapac.*`, `Catastro.*`, `Licencias.*`, `ProteccionCivil.*`, `Licencias.Contacto.*`, `ProteccionCivil.ContactoRepresentante.*`

Ejemplos:

```text
Sapac.NumeroCuenta
Sapac.IdTipoServicio          → 1 = SM, 2 = SP
Catastro.Clave
Licencias.NombreComercial
Licencias.TipoPersona         → 1 | 2
Licencias.Contacto.Nombre
ProteccionCivil.EsEmpresa     → 1 física, 2 moral
ProteccionCivil.TienePrograma → 0 | 1
ProteccionCivil.ContactoRepresentante.Telefono
```

El backend **siempre crea** Sapac, Catastro, Licencias y ProteccionCivil (aunque vengan vacíos).  
Contacto / ContactoRepresentante solo si traen información.

### Archivos (máx. 1 por campo)

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

No envíes firmas ni documentos de LicenciaConstruccion en este flujo.

---

## Flujo `PredioObra = 1`

### Textos

```text
LicenciaConstruccion.TipoSolicitudLicencia   → 1|2|3|4
LicenciaConstruccion.DescripcionProyecto
LicenciaConstruccion.Corresponsables[0].NombreCompleto
LicenciaConstruccion.Corresponsables[0].NoRegLicenciaConstruccion
LicenciaConstruccion.Corresponsables[0].CedulaProfesional
```

Índices: `0`, `1`, `2`…  
No envíes `Id` ni `IdLicenciaConstruccion` del corresponsable.

### Firmas (máx. 1)

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

No envíes Sapac/Catastro/Licencias/ProteccionCivil en este flujo.

---

## Servicio Angular

```typescript
// registros-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface CreateRegistroResponse {
  status: string;
  message: string;
  data: {
    id: number;
    nombre: string;
    idCapturistaVisita?: number | null;
    idSapac?: number | null;
    idCatastro?: number | null;
    idLicencia?: number | null;
    contacto?: unknown;
    idProteccionCivil?: number | null;
    contactoRepresentante?: unknown;
    fotos?: Array<{ id: number; idTipoFoto: number; ruta: string }>;
    idLicenciaConstruccion?: number | null;
    corresponsables?: unknown[];
    fotosLicenciaConstruccion?: Array<{
      id: number;
      idTipoFoto: number;
      ruta: string;
    }>;
  };
}

@Injectable({ providedIn: 'root' })
export class RegistrosApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl; // ej. https://api.ejemplo.com

  crearRegistro(formData: FormData): Observable<CreateRegistroResponse> {
    // No pongas Content-Type manualmente: el browser agrega el boundary.
    return this.http.post<CreateRegistroResponse>(
      `${this.baseUrl}/registros`,
      formData,
    );
  }
}
```

El interceptor de auth debe adjuntar el Bearer:

```typescript
// auth.interceptor.ts (ejemplo)
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthTokenService } from './auth-token.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthTokenService).accessToken;
  if (!token) return next(req);

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
```

---

## Armar el `FormData`

```typescript
// build-registro-form-data.ts

type Scalar = string | number | null | undefined;
type FileInput = File | null | undefined;

function appendIfPresent(
  fd: FormData,
  key: string,
  value: Scalar,
): void {
  // Omitir undefined: el backend no actualiza/crea con ese campo.
  // '' se puede enviar si quieres limpiar strings opcionales (el backend lo normaliza).
  if (value === undefined || value === null) return;
  fd.append(key, String(value));
}

function appendFile(
  fd: FormData,
  key: string,
  file: FileInput,
): void {
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

export interface RegistroCreateFormModel {
  Latitud: number;
  Longitud: number;
  TipoRegistro: 0 | 1;
  PredioObra: 0 | 1;
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

export function buildRegistroFormData(
  model: RegistroCreateFormModel,
): FormData {
  const fd = new FormData();

  appendIfPresent(fd, 'Latitud', model.Latitud);
  appendIfPresent(fd, 'Longitud', model.Longitud);
  appendIfPresent(fd, 'TipoRegistro', model.TipoRegistro);
  appendIfPresent(fd, 'PredioObra', model.PredioObra);
  appendIfPresent(fd, 'EntidadFederativa', model.EntidadFederativa);
  appendIfPresent(fd, 'Municipio', model.Municipio);
  appendIfPresent(fd, 'Localidad', model.Localidad);
  appendIfPresent(fd, 'Colonia', model.Colonia);
  appendIfPresent(fd, 'Calle', model.Calle);
  appendIfPresent(fd, 'NoInterior', model.NoInterior);
  appendIfPresent(fd, 'NoExterior', model.NoExterior);
  appendIfPresent(fd, 'CP', model.CP);

  if (model.PredioObra === 0) {
    for (const [k, v] of Object.entries(model.sapac ?? {})) {
      appendIfPresent(fd, `Sapac.${k}`, v);
    }
    for (const [k, v] of Object.entries(model.catastro ?? {})) {
      appendIfPresent(fd, `Catastro.${k}`, v);
    }
    for (const [k, v] of Object.entries(model.licencias ?? {})) {
      appendIfPresent(fd, `Licencias.${k}`, v);
    }
    for (const [k, v] of Object.entries(model.contacto ?? {})) {
      appendIfPresent(fd, `Licencias.Contacto.${k}`, v);
    }
    for (const [k, v] of Object.entries(model.proteccionCivil ?? {})) {
      appendIfPresent(fd, `ProteccionCivil.${k}`, v);
    }
    for (const [k, v] of Object.entries(model.contactoRepresentante ?? {})) {
      appendIfPresent(fd, `ProteccionCivil.ContactoRepresentante.${k}`, v);
    }
    for (const [key, file] of Object.entries(model.archivosPredio0 ?? {})) {
      appendFile(fd, key, file as FileInput);
    }
  }

  if (model.PredioObra === 1) {
    for (const [k, v] of Object.entries(model.licenciaConstruccion ?? {})) {
      appendIfPresent(fd, `LicenciaConstruccion.${k}`, v);
    }

    (model.corresponsables ?? []).forEach((item, i) => {
      appendIfPresent(
        fd,
        `LicenciaConstruccion.Corresponsables[${i}].NombreCompleto`,
        item.NombreCompleto,
      );
      appendIfPresent(
        fd,
        `LicenciaConstruccion.Corresponsables[${i}].NoRegLicenciaConstruccion`,
        item.NoRegLicenciaConstruccion,
      );
      appendIfPresent(
        fd,
        `LicenciaConstruccion.Corresponsables[${i}].CedulaProfesional`,
        item.CedulaProfesional,
      );
    });

    for (const [key, file] of Object.entries(model.firmas ?? {})) {
      appendFile(fd, key, file as FileInput);
    }
    for (const [key, files] of Object.entries(model.documentosLc ?? {})) {
      appendFiles(fd, key, files as File[]);
    }
  }

  return fd;
}
```

---

## Uso en un componente / signal store

```typescript
import { inject } from '@angular/core';
import { RegistrosApiService } from './registros-api.service';
import { buildRegistroFormData } from './build-registro-form-data';

// Ejemplo PredioObra = 0
const api = inject(RegistrosApiService);

const formData = buildRegistroFormData({
  Latitud: 18.9530959,
  Longitud: -99.2353385,
  TipoRegistro: 0,
  PredioObra: 0,
  Municipio: 'Cuernavaca',
  Colonia: 'Centro',
  Calle: 'Avenida Universidad',
  NoExterior: '100',
  CP: '62000',
  sapac: {
    NumeroCuenta: '123456',
    IdTipoServicio: 1,
    Medidor: 'ABC-01',
  },
  licencias: {
    NombreComercial: 'Comercio Ejemplo',
    TipoPersona: 1,
  },
  contacto: {
    Nombre: 'Juan',
    Telefono: '7771234567',
  },
  proteccionCivil: {
    EsEmpresa: 1,
    TienePrograma: 0,
  },
  archivosPredio0: {
    'Licencias.fachada': fachadaFile, // File desde <input type="file">
    'Sapac.reciboSapac': reciboFile,
  },
});

api.crearRegistro(formData).subscribe({
  next: (res) => {
    console.log('Creado id=', res.data.id);
  },
  error: (err) => {
    // 400 validación, 401 token, 413 archivo grande, etc.
    console.error(err?.error ?? err);
  },
});
```

### Input de archivos

```html
<input
  type="file"
  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
  (change)="onFachada($event)"
/>
```

```typescript
onFachada(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.fachadaFile = input.files?.[0] ?? null;
}
```

Para documentos múltiples (`PredioObra = 1`):

```html
<input
  type="file"
  multiple
  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
  (change)="onDocumentos($event)"
/>
```

---

## Errores frecuentes

| Error | Causa típica |
|------|---------------|
| `400` PredioObra / TipoRegistro | Enviar `"true"`/`"false"` o valores fuera de `0|1` |
| `400` campo no reconocido | JSON anidado o nombres distintos a los del contrato |
| `400` fotos SAPAC con PredioObra=1 | Mezclar flujos |
| `400` firmas con PredioObra=0 | Mezclar flujos |
| `401` | Token ausente o expirado |
| Archivo rechazado | MIME distinto a JPG/PNG/PDF o tamaño excedido |

---

## Respuesta 201 (ejemplo)

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
    "contacto": {
      "id": 3,
      "nombre": "Juan",
      "apellidoPaterno": null,
      "apellidoMaterno": null,
      "telefono": "7771234567",
      "correo": null
    },
    "idProteccionCivil": 4,
    "contactoRepresentante": null,
    "fotos": [
      { "id": 100, "idTipoFoto": 6, "ruta": "https://.../25/6/uuid.jpg" }
    ],
    "idLicenciaConstruccion": null,
    "corresponsables": [],
    "fotosLicenciaConstruccion": []
  }
}
```

---

## Checklist rápido Angular

- [ ] Usar `FormData`, no `JSON.stringify`
- [ ] No fijar `Content-Type` a mano
- [ ] Enviar Bearer JWT
- [ ] Mandar `TipoRegistro` / `PredioObra` como `0` o `1` (number o string numérico)
- [ ] Separar UI/campos según `PredioObra`
- [ ] Archivos con el **nombre exacto** del campo (`Licencias.fachada`, etc.)
- [ ] Corresponsables indexados: `LicenciaConstruccion.Corresponsables[i].*`
- [ ] No enviar capturista, grupo, estatus ni ids internos de relaciones

---

## Referencia backend

- Controller: `src/registros/registros.controller.ts` → `POST /registros`
- Parser: `src/registros/registro-form.parser.ts`
- Servicio: `src/registros/registros.service.ts` → `createFromMultipart`
