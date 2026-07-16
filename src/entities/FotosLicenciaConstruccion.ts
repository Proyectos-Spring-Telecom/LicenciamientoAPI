import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { applySchema } from 'src/common/apply-schema.decorator';
import { LicenciaConstruccion } from './LicenciaConstruccion';
import { TipoFoto } from './TipoFoto';

@applySchema
@Index('IX_FotosLicConst_IdLicenciaConstruccion', ['idLicenciaConstruccion'], {})
@Index('FK_FotosLicConst_TipoFoto', ['idTipoFoto'], {})
@Entity('FotosLicenciaConstruccion')
export class FotosLicenciaConstruccion {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdLicenciaConstruccion', nullable: true })
  idLicenciaConstruccion: number | null;

  @Column('longtext', { name: 'Ruta', nullable: true })
  ruta: string | null;

  @Column('datetime', { name: 'FechaHora', nullable: true })
  fechaHora: Date | null;

  @Column('int', { name: 'IdTipoFoto', nullable: true })
  idTipoFoto: number | null;

  @ManyToOne(
    () => LicenciaConstruccion,
    (licencia) => licencia.fotos,
    {
      onDelete: 'CASCADE',
      onUpdate: 'RESTRICT',
    },
  )
  @JoinColumn([
    {
      name: 'IdLicenciaConstruccion',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_FotosLicConst_LicenciaConstruccion',
    },
  ])
  idLicenciaConstruccion2: LicenciaConstruccion;

  @ManyToOne(() => TipoFoto, (tipoFoto) => tipoFoto.fotosLicenciaConstruccion, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdTipoFoto',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_FotosLicConst_TipoFoto',
    },
  ])
  idTipoFoto2: TipoFoto;
}
