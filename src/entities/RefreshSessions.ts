import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuarios } from './Usuarios';
import { applySchema } from 'src/common/apply-schema.decorator';

@applySchema
@Index('UQ_RefreshSessions_Jti', ['jti'], { unique: true })
@Index('IX_RefreshSessions_IdUsuario', ['idUsuario'], {})
@Index('IX_RefreshSessions_IdUsuario_activa', ['idUsuario', 'revokedAt', 'expiresAt'], {})
@Entity('RefreshSessions')
export class RefreshSessions {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdUsuario' })
  idUsuario: number;

  @Column('char', { name: 'Jti', length: 36, unique: true })
  jti: string;

  @Column('char', { name: 'TokenHash', length: 64 })
  tokenHash: string;

  @Column('datetime', { name: 'ExpiresAt', precision: 3 })
  expiresAt: Date;

  @Column('datetime', { name: 'RevokedAt', precision: 3, nullable: true })
  revokedAt: Date | null;

  @Column('bigint', { name: 'ReplacedById', nullable: true })
  replacedById: number | null;

  @Column('datetime', {
    name: 'FechaCreacion',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  fechaCreacion: Date;

  @ManyToOne(() => Usuarios, (usuario) => usuario.refreshSessions, {
    onDelete: 'CASCADE',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn([
    {
      name: 'IdUsuario',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_RefreshSessions_Usuarios',
    },
  ])
  usuario: Usuarios;

  @ManyToOne(() => RefreshSessions, { nullable: true })
  @JoinColumn([{ name: 'ReplacedById', referencedColumnName: 'id' }])
  replacedBy: RefreshSessions | null;
}
