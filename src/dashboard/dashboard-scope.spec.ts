import { describe, expect, it } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import {
  assertCapturaPeriodoGrupoFilter,
  buildDashboardGroupExistsSql,
  resolveDashboardScope,
} from './dashboard-scope';

describe('resolveDashboardScope', () => {
  const base = {
    userId: 10,
    email: 'u@test.com',
  };

  it('rol 4 y 3 ven todos', () => {
    expect(
      resolveDashboardScope({ ...base, idGrupo: null, rol: 4 }),
    ).toEqual({ idRol: 4, idGrupo: null, canViewAll: true });
    expect(
      resolveDashboardScope({ ...base, idGrupo: 9, rol: 3 }),
    ).toEqual({ idRol: 3, idGrupo: null, canViewAll: true });
  });

  it('rol 2 usa IdGrupo del token', () => {
    expect(
      resolveDashboardScope({ ...base, idGrupo: 1, rol: 2 }),
    ).toEqual({ idRol: 2, idGrupo: 1, canViewAll: false });
  });

  it('rol 2 sin grupo válido lanza 403', () => {
    const casos: AuthenticatedUser[] = [
      { ...base, idGrupo: null, rol: 2 },
      { ...base, idGrupo: undefined as unknown as null, rol: 2 },
      { ...base, idGrupo: Number.NaN, rol: 2 },
      { ...base, idGrupo: 0, rol: 2 },
    ];

    for (const user of casos) {
      expect(() => resolveDashboardScope(user)).toThrow(ForbiddenException);
    }
  });

  it('rol 1 y roles inválidos lanzan 403', () => {
    expect(() =>
      resolveDashboardScope({ ...base, idGrupo: 1, rol: 1 }),
    ).toThrow(ForbiddenException);
    expect(() =>
      resolveDashboardScope({ ...base, idGrupo: 1, rol: 99 }),
    ).toThrow(ForbiddenException);
    expect(() =>
      resolveDashboardScope({ ...base, idGrupo: 1, rol: null }),
    ).toThrow(ForbiddenException);
  });

  it('buildDashboardGroupExistsSql usa alias de registro sin JOIN multiplicador', () => {
    const sql = buildDashboardGroupExistsSql('r.Id');
    expect(sql).toContain('EXISTS');
    expect(sql).toContain('CapturistaVisita cv_scope');
    expect(sql).toContain('cv_scope.IdRegistro = r.Id');
    expect(sql).toContain('cv_scope.IdGrupo = ?');
  });

  it('assertCapturaPeriodoGrupoFilter bloquea otro grupo en rol 2', () => {
    const scope = resolveDashboardScope({ ...base, idGrupo: 1, rol: 2 });
    expect(() => assertCapturaPeriodoGrupoFilter(scope, 2)).toThrow(
      ForbiddenException,
    );
    expect(() => assertCapturaPeriodoGrupoFilter(scope, 1)).not.toThrow();
    expect(() => assertCapturaPeriodoGrupoFilter(scope)).not.toThrow();
  });
});
