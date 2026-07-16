import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Grupos } from './Grupos';
import { Registros } from './Registros';
import { Usuarios } from './Usuarios';
import { applySchema } from 'src/common/apply-schema.decorator';

@applySchema
@Index('IX_CapturistaVisita_IdRegistro', ['idRegistro'], {})
@Index('IX_CapturistaVisita_IdGrupo', ['idGrupo'], {})
@Index('FK_CapturistaVisita_Capturista', ['idCapturista'], {})
@Index('FK_CapturistaVisita_Supervisor', ['idSupervisor'], {})
@Entity('CapturistaVisita')
export class CapturistaVisita {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdRegistro', nullable: true })
  idRegistro: number | null;

  @Column('bigint', { name: 'IdCapturista', nullable: true })
  idCapturista: number | null;

  @Column('bigint', { name: 'IdSupervisor', nullable: true })
  idSupervisor: number | null;

  @Column('bigint', { name: 'IdGrupo', nullable: true })
  idGrupo: number | null;

  @Column('datetime', { name: 'FechaHora', nullable: true })
  fechaHora: Date | null;

  @ManyToOne(() => Registros, (registro) => registro.capturistaVisitas, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdRegistro',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_CapturistaVisita_Registros',
    },
  ])
  idRegistro2: Registros;

  @ManyToOne(() => Usuarios, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdCapturista',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_CapturistaVisita_Capturista',
    },
  ])
  idCapturista2: Usuarios;

  @ManyToOne(() => Usuarios, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdSupervisor',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_CapturistaVisita_Supervisor',
    },
  ])
  idSupervisor2: Usuarios;

  @ManyToOne(() => Grupos, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdGrupo',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_CapturistaVisita_Grupos',
    },
  ])
  idGrupo2: Grupos;
}
