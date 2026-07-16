/**
 * Contrato del usuario autenticado expuesto en `request.user`
 * por la estrategia JWT (Passport). Los identificadores se mantienen
 * como `number` siguiendo el patrón existente del proyecto.
 */
export interface AuthenticatedUser {
  userId: number;
  email: string;
  idGrupo: number | null;
  rol: number | null;
}
