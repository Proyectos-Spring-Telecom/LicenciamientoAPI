# Consumir `POST /registros` desde Angular

Guía práctica para crear un registro desde Angular usando `multipart/form-data`.

Contrato completo: [contratos.md](./contratos.md) · Contexto: [contexto.md](./contexto.md) · PATCH: [consumo-patch-registros-actualizar-angular.md](./consumo-patch-registros-actualizar-angular.md)

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
   - `0` → Sapac, Catastro, Licencias, ProteccionCivil (+ fotos 1–9)
   - `1` → LicenciaConstruccion, corresponsables, archivos LC (10–18, 25–29, 31–32)
6. **Excepción transversal (solo archivos):** `Licencias.fachada`, `Licencias.estacionamiento`, `Licencias.bodega` se procesan **también** con `PredioObra = 1`. El resto de datos de Licencias no.
7. Archivos permitidos: **JPG / JPEG / PNG / PDF**.
8. Valores `0` son válidos. No los conviertas a `null` ni a `boolean`.
9. Cada archivo de LicenciaConstruccion: **máximo 1** por campo (ya no hay campos multi-archivo).

---

## Campos raíz (siempre)

| Campo | Obligatorio | Valores |
|------|-------------|---------|
| `Latitud` | Sí | number |
| `Longitud` | Sí | number |
| `TipoRegistro` | Sí | `0` Local comercial, `1` Vivienda |
| `PredioObra` | Sí | `0` No construcción, `1` En construcción |
| `EntidadFederativa` … `CP` | No | string (`CP` conserva ceros) |

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
Licencias.Estacionamiento     → 0 | 1
Licencias.Contacto.Nombre
ProteccionCivil.EsEmpresa     → 1 física, 2 moral
ProteccionCivil.TienePrograma → 0 | 1
ProteccionCivil.ContactoRepresentante.Telefono
```

El backend **siempre crea** Sapac, Catastro, Licencias y ProteccionCivil (aunque vengan vacíos).  
Contacto / ContactoRepresentante solo si traen información.

### Archivos (máx. 1 por campo) → `Fotos`

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

No envíes archivos de LicenciaConstruccion en este flujo.

---

## Flujo `PredioObra = 1`

### Textos LicenciaConstruccion

```text
LicenciaConstruccion.TipoSolicitudLicencia   → 1|2|3|4
LicenciaConstruccion.DescripcionProyecto
LicenciaConstruccion.SuperficieTerrenoM2     → 0 válido
LicenciaConstruccion.NumeroExpediente        → max 50
LicenciaConstruccion.NumeroControl           → max 50
LicenciaConstruccion.SeguimientoObra         → string max 50
LicenciaConstruccion.ConstanciaAlineamiento  → 0|1
LicenciaConstruccion.LicenciaUsoSuelo        → 0|1
LicenciaConstruccion.PlanoAutorizado         → 0|1
LicenciaConstruccion.LicenciaFraccionamiento → 0|1
LicenciaConstruccion.Escrituras              → 0|1
LicenciaConstruccion.FactibilidadAguaPotable → 0|1
LicenciaConstruccion.RecibosPagoPredial      → 0|1
LicenciaConstruccion.RecibosMunicipales      → 0|1
LicenciaConstruccion.PlanoArquitectonicos    → 0|1
LicenciaConstruccion.Otros                   → 0|1
LicenciaConstruccion.Corresponsables[0].NombreCompleto
LicenciaConstruccion.Corresponsables[0].NoRegLicenciaConstruccion
LicenciaConstruccion.Corresponsables[0].CedulaProfesional
```

Índices: `0`, `1`, `2`…  
No envíes `Id` ni `IdLicenciaConstruccion` del corresponsable.

### Archivos LC (máx. 1 por campo) → `FotosLicenciaConstruccion`

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

**Obsoletos (no usar):** `constanciaAlineamientoyNumero`, `LicenciaUsoyPlano`, `JuegoDePlanosArquitectonicos` (multi).

### Transversales con PredioObra = 1

Puedes enviar también:

```text
Licencias.fachada
Licencias.estacionamiento
Licencias.bodega
```

Se guardan en `Fotos` (6/7/8). No envíes el resto de `Licencias.*` textuales en este flujo (se ignoran).

---

## Servicio Angular

```typescript
// registros-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  private readonly baseUrl = environment.apiUrl;

  crearRegistro(formData: FormData): Observable<CreateRegistroResponse> {
    // No pongas Content-Type manualmente: el browser agrega el boundary.
    return this.http.post<CreateRegistroResponse>(
      `${this.baseUrl}/registros`,
      formData,
    );
  }
}
```

---

## Armar el `FormData`

```typescript
// build-registro-form-data.ts

type Scalar = string | number | null | undefined;
type FileInput = File | null | undefined;

function appendIfPresent(fd: FormData, key: string, value: Scalar): void {
  if (value === undefined || value === null) return;
  fd.append(key, String(value));
}

function appendFile(fd: FormData, key: string, file: FileInput): void {
  if (file) fd.append(key, file, file.name);
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
    NombreCompleto?: string;
    NoRegLicenciaConstruccion?: string;
    CedulaProfesional?: string;
  }>;
  /** Un archivo por IdTipoFoto (máx. 1). Incluye firmas y documentos. */
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
  /** Transversales: válidos también con PredioObra = 1 */
  archivosTransversales?: {
    'Licencias.fachada'?: FileInput;
    'Licencias.estacionamiento'?: FileInput;
    'Licencias.bodega'?: FileInput;
  };
}

export function buildRegistroFormData(model: RegistroCreateFormModel): FormData {
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
    for (const [key, file] of Object.entries(model.archivosLc ?? {})) {
      appendFile(fd, key, file as FileInput);
    }
    for (const [key, file] of Object.entries(model.archivosTransversales ?? {})) {
      appendFile(fd, key, file as FileInput);
    }
  }

  return fd;
}
```

---

## Ejemplo de uso

```typescript
const formData = buildRegistroFormData({
  Latitud: 18.9530959,
  Longitud: -99.2353385,
  TipoRegistro: 1,
  PredioObra: 1,
  Municipio: 'Cuernavaca',
  licenciaConstruccion: {
    TipoSolicitudLicencia: 2,
    DescripcionProyecto: 'Construcción de vivienda',
    NumeroExpediente: 'EXP-2026-001',
    SeguimientoObra: 'En revisión',
    ConstanciaAlineamiento: 1,
    LicenciaUsoSuelo: 0,
  },
  corresponsables: [{ NombreCompleto: 'Arq Uno', CedulaProfesional: '123' }],
  archivosLc: {
    'LicenciaConstruccion.constanciaAlineamiento': constanciaFile,
    'LicenciaConstruccion.constanciaNumero': numeroOficialFile,
    'LicenciaConstruccion.JuegoDePlanosArquitectonicos1': plano1File,
    'LicenciaConstruccion.FirmaPropietario': firmaFile,
  },
  archivosTransversales: {
    'Licencias.fachada': fachadaFile,
  },
});

api.crearRegistro(formData).subscribe({
  next: (res) => console.log('Creado id=', res.data.id),
  error: (err) => console.error(err?.error ?? err),
});
```

---

## Errores frecuentes

| Error | Causa típica |
|------|---------------|
| `400` PredioObra / TipoRegistro | Enviar `"true"`/`"false"` o valores fuera de `0\|1` |
| `400` campo no reconocido | Nombres antiguos multi-archivo o JSON anidado |
| `400` fotos SAPAC con PredioObra=1 | Mezclar flujos (excepto fachada/estacionamiento/bodega) |
| `400` más de un archivo en un campo LC | Enviar `multiple` en un input de LC |
| `401` | Token ausente o expirado |

---

## Checklist rápido Angular

- [ ] Usar `FormData`, no `JSON.stringify`
- [ ] No fijar `Content-Type` a mano
- [ ] Enviar Bearer JWT
- [ ] `TipoRegistro` / `PredioObra` como `0` o `1`
- [ ] Un archivo por campo LC (sin `multiple` en esos inputs)
- [ ] Nombres nuevos: `constanciaAlineamiento`, `constanciaNumero`, `JuegoDePlanosArquitectonicos1|2|3`
- [ ] Transversales 6/7/8 permitidos con PredioObra = 1
- [ ] No enviar capturista, grupo, estatus ni ids internos

---

## Referencia backend

- Controller: `src/registros/registros.controller.ts` → `POST /registros`
- Constantes: `src/registros/licencia-construccion.constants.ts` → `LC_FILE_TIPO_FOTO`
- Parser: `src/registros/registro-form.parser.ts`
- Servicio: `src/registros/registros.service.ts`
