import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateLicenciaConstruccionDto } from './dto/create-licencia-construccion.dto';
import { CreateProteccionCivilDto } from './dto/create-proteccion-civil.dto';

describe('CreateProteccionCivilDto.EsEmpresa', () => {
  async function validateEsEmpresa(value: unknown) {
    const dto = plainToInstance(CreateProteccionCivilDto, {
      EsEmpresa: value,
    });
    const errors = await validate(dto);
    const fieldErrors = errors.filter(
      (error) => error.property === 'EsEmpresa',
    );
    return { dto, fieldErrors };
  }

  it.each([
    ['1', 1],
    ['2', 2],
    [1, 1],
    [2, 2],
  ])('acepta %p y lo transforma a %p', async (input, expected) => {
    const { dto, fieldErrors } = await validateEsEmpresa(input);

    expect(fieldErrors).toHaveLength(0);
    expect(dto.EsEmpresa).toBe(expected);
    expect(typeof dto.EsEmpresa).toBe('number');
    expect(dto.EsEmpresa).not.toBe(true);
    expect(dto.EsEmpresa).not.toBe(false);
  });

  it.each(['0', '3', 0, 3, -1])(
    'rechaza el valor fuera de catálogo %p',
    async (input) => {
      const { fieldErrors } = await validateEsEmpresa(input);

      expect(fieldErrors.length).toBeGreaterThan(0);
      expect(
        Object.values(fieldErrors[0].constraints ?? {}).join(' '),
      ).toContain(
        'ProteccionCivil.EsEmpresa debe ser 1 para Persona física o 2 para Persona moral',
      );
    },
  );

  it.each(['true', 'false', true, false, '1abc'])(
    'rechaza el valor no numérico de catálogo %p',
    async (input) => {
      const { fieldErrors } = await validateEsEmpresa(input);

      expect(fieldErrors.length).toBeGreaterThan(0);
    },
  );

  it('no convierte 2 a boolean', async () => {
    const { dto, fieldErrors } = await validateEsEmpresa('2');

    expect(fieldErrors).toHaveLength(0);
    expect(dto.EsEmpresa).toBe(2);
    expect(typeof dto.EsEmpresa).toBe('number');
    expect(dto.EsEmpresa).not.toBe(1);
  });
});

describe('CreateLicenciaConstruccionDto.TipoSolicitudLicencia', () => {
  async function validateTipoSolicitud(value: unknown) {
    const dto = plainToInstance(CreateLicenciaConstruccionDto, {
      TipoSolicitudLicencia: value,
    });
    const errors = await validate(dto);
    const fieldErrors = errors.filter(
      (error) => error.property === 'TipoSolicitudLicencia',
    );
    return { dto, fieldErrors };
  }

  it.each([
    ['1', 1],
    ['2', 2],
    ['3', 3],
    ['4', 4],
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
  ])('acepta %p y lo transforma a %p', async (input, expected) => {
    const { dto, fieldErrors } = await validateTipoSolicitud(input);

    expect(fieldErrors).toHaveLength(0);
    expect(dto.TipoSolicitudLicencia).toBe(expected);
    expect(typeof dto.TipoSolicitudLicencia).toBe('number');
  });

  it.each(['0', '5', 0, 5, -1])(
    'rechaza el valor fuera de catálogo %p',
    async (input) => {
      const { fieldErrors } = await validateTipoSolicitud(input);

      expect(fieldErrors.length).toBeGreaterThan(0);
      expect(
        Object.values(fieldErrors[0].constraints ?? {}).join(' '),
      ).toContain(
        'LicenciaConstruccion.TipoSolicitudLicencia debe ser 1, 2, 3 o 4',
      );
    },
  );

  it.each(['obra nueva', true, false, 'true', 'false'])(
    'rechaza el valor no numérico de catálogo %p',
    async (input) => {
      const { fieldErrors } = await validateTipoSolicitud(input);

      expect(fieldErrors.length).toBeGreaterThan(0);
    },
  );
});

describe('CreateLicenciaConstruccionDto nuevos campos escalares', () => {
  async function validateLc(
    payload: Record<string, unknown>,
    property: string,
  ) {
    const dto = plainToInstance(CreateLicenciaConstruccionDto, payload);
    const errors = await validate(dto);
    const fieldErrors = errors.filter((error) => error.property === property);
    return { dto, fieldErrors };
  }

  it('acepta todos los nuevos campos con 0 y 1 preservados', async () => {
    const { dto, fieldErrors } = await validateLc(
      {
        NumeroExpediente: 'EXP-2026-001',
        NumeroControl: 'CTRL-001',
        SeguimientoObra: 'En revisión',
        ClaveCatastral: '0001-002-003',
        ConstanciaAlineamiento: '1',
        LicenciaUsoSuelo: '0',
        PlanoAutorizado: '1',
        LicenciaFraccionamiento: '0',
        Escrituras: '1',
        FactibilidadAguaPotable: '1',
        RecibosPagoPredial: '0',
        RecibosMunicipales: '1',
        PlanoArquitectonicos: '1',
        Otros: '0',
      },
      'ConstanciaAlineamiento',
    );

    expect(fieldErrors).toHaveLength(0);
    expect(dto.NumeroExpediente).toBe('EXP-2026-001');
    expect(dto.NumeroControl).toBe('CTRL-001');
    expect(dto.SeguimientoObra).toBe('En revisión');
    expect(dto.ClaveCatastral).toBe('0001-002-003');
    expect(dto.ConstanciaAlineamiento).toBe(1);
    expect(dto.LicenciaUsoSuelo).toBe(0);
    expect(dto.Otros).toBe(0);
    expect(dto.LicenciaUsoSuelo).not.toBe(true);
    expect(dto.LicenciaUsoSuelo).not.toBe(false);
  });

  it.each([
    ['ConstanciaAlineamiento', '2'],
    ['ConstanciaAlineamiento', 'true'],
    ['ConstanciaAlineamiento', 'abc'],
    ['NumeroExpediente', 'x'.repeat(51)],
    ['SeguimientoObra', 'x'.repeat(51)],
    ['ClaveCatastral', 'x'.repeat(101)],
  ])('rechaza %s inválido %p', async (property, value) => {
    const { fieldErrors } = await validateLc({ [property]: value }, property);
    expect(fieldErrors.length).toBeGreaterThan(0);
  });

  it.each(['0', '1', 0, 1])(
    'acepta indicador ConstanciaAlineamiento=%p',
    async (input) => {
      const { dto, fieldErrors } = await validateLc(
        { ConstanciaAlineamiento: input },
        'ConstanciaAlineamiento',
      );
      expect(fieldErrors).toHaveLength(0);
      expect(dto.ConstanciaAlineamiento).toBe(Number(input));
    },
  );
});
