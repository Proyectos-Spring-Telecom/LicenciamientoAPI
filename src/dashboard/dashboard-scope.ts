import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

/**
 * Alcance de lectura del dashboard según el JWT.
 * Única fuente de verdad para roles 4/3 (todos), 2 (grupo) y denegación del resto.
 */
export interface DashboardScope {
  idRol: number;
  idGrupo: number | null;
  canViewAll: boolean;
}

/**
 * Resuelve el alcance a partir de `AuthenticatedUser` (`rol`, `idGrupo`).
 * No usa body, query ni path.
 */
export function resolveDashboardScope(
  authUser: AuthenticatedUser,
): DashboardScope {
  if (authUser.rol === undefined || authUser.rol === null) {
    throw new ForbiddenException('Rol de usuario inválido.');
  }

  const idRol = Number(authUser.rol);

  if (!Number.isInteger(idRol)) {
    throw new ForbiddenException('Rol de usuario inválido.');
  }

  if (idRol === 4 || idRol === 3) {
    return {
      idRol,
      idGrupo: null,
      canViewAll: true,
    };
  }

  if (idRol === 2) {
    if (
      authUser.idGrupo === undefined ||
      authUser.idGrupo === null ||
      String(authUser.idGrupo).trim() === ''
    ) {
      throw new ForbiddenException(
        'El usuario autenticado no tiene un grupo asignado.',
      );
    }

    const idGrupo = Number(authUser.idGrupo);

    if (!Number.isInteger(idGrupo) || idGrupo < 1) {
      throw new ForbiddenException(
        'El usuario autenticado no tiene un grupo asignado.',
      );
    }

    return {
      idRol,
      idGrupo,
      canViewAll: false,
    };
  }

  if (idRol === 1) {
    throw new ForbiddenException(
      'No tiene permisos para consultar el dashboard.',
    );
  }

  throw new ForbiddenException(
    'Rol sin permisos para consultar el dashboard.',
  );
}

/**
 * Condición SQL EXISTS sobre CapturistaVisita para limitar registros al grupo del token.
 * Evita duplicar filas en agregaciones (COUNT/SUM/GROUP BY).
 *
 * @param registroIdExpression Expresión de Id del registro, p. ej. `Registros.Id` o `r.Id`.
 */
export function buildDashboardGroupExistsSql(
  registroIdExpression: string,
): string {
  return `EXISTS (
    SELECT 1
    FROM CapturistaVisita cv_scope
    WHERE cv_scope.IdRegistro = ${registroIdExpression}
      AND cv_scope.IdGrupo = ?
  )`;
}

/**
 * Para rol 2: si el cliente envía `idGrupo` distinto al del token → 403.
 * No amplía el alcance; el filtro efectivo sigue siendo el del JWT.
 */
export function assertCapturaPeriodoGrupoFilter(
  scope: DashboardScope,
  idGrupoFiltro?: number,
): void {
  if (scope.canViewAll || idGrupoFiltro === undefined) {
    return;
  }

  if (Number(idGrupoFiltro) !== scope.idGrupo) {
    throw new ForbiddenException(
      'No tiene permisos para consultar el dashboard de otro grupo.',
    );
  }
}
