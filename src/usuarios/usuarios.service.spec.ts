import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UsuariosService } from './usuarios.service';

function user(
  partial: Partial<AuthenticatedUser> & Pick<AuthenticatedUser, 'rol'>,
): AuthenticatedUser {
  return {
    userId: partial.userId === undefined ? 99 : partial.userId,
    email: partial.email ?? 'test@example.com',
    idGrupo: partial.idGrupo !== undefined ? partial.idGrupo : 1,
    rol: partial.rol,
  };
}

function createService(overrides?: {
  queryResults?: unknown[][];
  findResult?: unknown[];
}) {
  let queryCall = 0;
  const queryResults = overrides?.queryResults ?? [];
  const query = jest.fn().mockImplementation(() => {
    const result = queryResults[queryCall] ?? [];
    queryCall += 1;
    return Promise.resolve(result);
  });
  const find = jest.fn().mockResolvedValue(overrides?.findResult ?? []);

  const usuarioRepository = { query, find };
  const service = new UsuariosService(
    usuarioRepository as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  return { service, query, find };
}

describe('UsuariosService — visibilidad GET', () => {
  describe('getAllListUsuarios', () => {
    it('rol 4 consulta sin filtro de rol ni grupo', async () => {
      const { service, query } = createService({
        queryResults: [[{ Id: 1, IdRol: 4, IdGrupo: 1 }]],
      });

      await service.getAllListUsuarios(user({ rol: 4 }));

      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      expect(sql).not.toMatch(/IdRol\s*<>/i);
      expect(sql).not.toMatch(/IdGrupo\s*=/i);
      expect(params).toEqual([]);
    });

    it('rol 3 excluye usuarios con IdRol = 4', async () => {
      const { service, query } = createService({
        queryResults: [[{ Id: 2, IdRol: 3, IdGrupo: 1 }]],
      });

      await service.getAllListUsuarios(user({ rol: 3, idGrupo: 1 }));

      const [sql, params] = query.mock.calls[0];
      expect(sql).toMatch(/u\.IdRol\s*<>\s*\?/i);
      expect(sql).not.toMatch(/IdGrupo\s*=/i);
      expect(params).toEqual([4]);
    });

    it('rol 2 filtra por grupo del token y excluye rol 4', async () => {
      const { service, query } = createService({
        queryResults: [[{ Id: 3, IdRol: 2, IdGrupo: 1 }]],
      });

      await service.getAllListUsuarios(user({ rol: 2, idGrupo: 1 }));

      const [sql, params] = query.mock.calls[0];
      expect(sql).toMatch(/u\.IdGrupo\s*=\s*\?/i);
      expect(sql).toMatch(/u\.IdRol\s*<>\s*\?/i);
      expect(params).toEqual([1, 4]);
    });

    it('rol 1 recibe 403', async () => {
      const { service, query } = createService();
      await expect(
        service.getAllListUsuarios(user({ rol: 1 })),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(query).not.toHaveBeenCalled();
    });

    it('rol inválido o ausente recibe 403', async () => {
      const { service } = createService();
      await expect(
        service.getAllListUsuarios(user({ rol: null })),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.getAllListUsuarios(user({ rol: 9 })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rol 2 sin grupo recibe 403', async () => {
      const { service, query } = createService();
      await expect(
        service.getAllListUsuarios(user({ rol: 2, idGrupo: null })),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('getAllUsuario (paginado)', () => {
    it('rol 3 calcula total con el mismo filtro de seguridad', async () => {
      const { service, query } = createService({
        queryResults: [
          [{ Id: 2, IdRol: 3, IdGrupo: 1 }],
          [{ total: 15 }],
        ],
      });

      const result = await service.getAllUsuario(user({ rol: 3 }), 1, 10);

      expect(result.paginated?.total).toBe(15);
      expect(query).toHaveBeenCalledTimes(2);

      const [listSql, listParams] = query.mock.calls[0];
      const [countSql, countParams] = query.mock.calls[1];
      expect(listSql).toMatch(/u\.IdRol\s*<>\s*\?/i);
      expect(listParams).toEqual([4, 10, 0]);
      expect(countSql).toMatch(/COUNT\(\*\)/i);
      expect(countSql).toMatch(/u\.IdRol\s*<>\s*\?/i);
      expect(countParams).toEqual([4]);
    });

    it('rol 2 pagina solo su grupo', async () => {
      const { service, query } = createService({
        queryResults: [[], [{ total: 2 }]],
      });

      const result = await service.getAllUsuario(
        user({ rol: 2, idGrupo: 1 }),
        2,
        5,
      );

      expect(result.paginated?.total).toBe(2);
      const [, listParams] = query.mock.calls[0];
      const [, countParams] = query.mock.calls[1];
      expect(listParams).toEqual([1, 4, 5, 5]);
      expect(countParams).toEqual([1, 4]);
    });

    it('rol 1 no ejecuta consulta paginada', async () => {
      const { service, query } = createService();
      await expect(
        service.getAllUsuario(user({ rol: 1 }), 1, 10),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('getUsuarioByID', () => {
    it('consulta solo por Id, sin filtro de rol ni grupo', async () => {
      const { service, query } = createService({
        queryResults: [[{ id: 1, idRol: 4, idGrupo: 1 }]],
      });

      await service.getUsuarioByID(1);

      const [sql, params] = query.mock.calls[0];
      expect(sql).toMatch(/u\.Id\s*=\s*\?/i);
      expect(sql).not.toMatch(/IdRol\s*<>/i);
      expect(sql).not.toMatch(/IdGrupo\s*=/i);
      expect(params).toEqual([1]);
    });

    it('usuario inexistente → 404', async () => {
      const { service } = createService({ queryResults: [[]] });
      await expect(service.getUsuarioByID(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getAllListUsuariosGrupo', () => {
    it('rol 2 con otro grupo → 403', async () => {
      const { service, find } = createService();
      await expect(
        service.getAllListUsuariosGrupo(2, user({ rol: 2, idGrupo: 1 })),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(find).not.toHaveBeenCalled();
    });

    it('rol 2 con su grupo aplica Not(4) y estatus activo', async () => {
      const { service, find } = createService({
        findResult: [
          {
            id: 3,
            idRol: 2,
            idGrupo: 1,
            passwordHash: 'x',
            nombre: 'C',
          },
        ],
      });

      const result = await service.getAllListUsuariosGrupo(
        1,
        user({ rol: 2, idGrupo: 1 }),
      );

      expect(find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          estatus: 1,
          idGrupo: 1,
        }),
      });
      const where = find.mock.calls[0][0].where;
      expect(where.idRol).toBeDefined();
      expect(result.data[0]).not.toHaveProperty('passwordHash');
    });

    it('rol 4 puede consultar cualquier grupo sin excluir rol 4', async () => {
      const { service, find } = createService({
        findResult: [{ id: 1, idRol: 4, idGrupo: 2, passwordHash: 'x' }],
      });

      await service.getAllListUsuariosGrupo(2, user({ rol: 4 }));

      expect(find).toHaveBeenCalledWith({
        where: { estatus: 1, idGrupo: 2 },
      });
    });

    it('rol 3 excluye rol 4 en el find', async () => {
      const { service, find } = createService({
        findResult: [{ id: 2, idRol: 3, idGrupo: 2, passwordHash: null }],
      });

      await service.getAllListUsuariosGrupo(2, user({ rol: 3 }));

      const where = find.mock.calls[0][0].where;
      expect(where.idGrupo).toBe(2);
      expect(where.idRol).toBeDefined();
    });

    it('rol 1 → 403', async () => {
      const { service, find } = createService();
      await expect(
        service.getAllListUsuariosGrupo(1, user({ rol: 1 })),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(find).not.toHaveBeenCalled();
    });
  });

  describe('seguridad: alcance no ampliable por cliente', () => {
    it('rol 2 no usa un IdGrupo distinto del token aunque se pase en path', async () => {
      const { service, find } = createService();
      await expect(
        service.getAllListUsuariosGrupo(99, user({ rol: 2, idGrupo: 1 })),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(find).not.toHaveBeenCalled();
    });

    it('filtros de seguridad van en SQL (params), no en memoria', async () => {
      const { service, query } = createService({
        queryResults: [[{ Id: 3, IdRol: 2, IdGrupo: 1 }]],
      });

      await service.getAllListUsuarios(user({ rol: 2, idGrupo: 1 }));

      expect(query).toHaveBeenCalled();
      const [sql] = query.mock.calls[0];
      expect(sql).toMatch(/WHERE/i);
      expect(sql).toMatch(/IdGrupo/i);
      expect(sql).toMatch(/IdRol/i);
    });
  });
});
