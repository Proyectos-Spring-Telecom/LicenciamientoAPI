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
