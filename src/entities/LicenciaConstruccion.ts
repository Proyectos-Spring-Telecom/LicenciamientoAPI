import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { applySchema } from 'src/common/apply-schema.decorator';
import { Corresponsables } from './Corresponsables';
import { FotosLicenciaConstruccion } from './FotosLicenciaConstruccion';
import { Registros } from './Registros';

@applySchema
@Index('UQ_LicenciaConstruccion_IdRegistro', ['idRegistro'], { unique: true })
@Entity('LicenciaConstruccion')
export class LicenciaConstruccion {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdRegistro' })
  idRegistro: number;

  @Column('tinyint', { name: 'TipoSolicitudLicencia', nullable: true })
  tipoSolicitudLicencia: number | null;

  @Column('text', { name: 'DescripcionProyecto', nullable: true })
  descripcionProyecto: string | null;

  @Column('decimal', {
    name: 'SuperficieTerrenoM2',
    nullable: true,
    precision: 12,
    scale: 2,
  })
  superficieTerrenoM2: number | null;

  @Column('decimal', {
    name: 'SuperficieTerrenoObraM2',
    nullable: true,
    precision: 12,
    scale: 2,
  })
  superficieTerrenoObraM2: number | null;

  @Column('text', { name: 'DescripcionSistemaConstructivo', nullable: true })
  descripcionSistemaConstructivo: string | null;

  @Column('varchar', { name: 'NombrePropietario', nullable: true, length: 191 })
  nombrePropietario: string | null;

  @Column('varchar', {
    name: 'DomicilioNotificacion',
    nullable: true,
    length: 191,
  })
  domicilioNotificacion: string | null;

  @Column('varchar', { name: 'RFC', nullable: true, length: 16 })
  rfc: string | null;

  @Column('varchar', { name: 'NombreDRO', nullable: true, length: 191 })
  nombreDRO: string | null;

  @Column('varchar', {
    name: 'NoRegLicenciaConstruccion',
    nullable: true,
    length: 50,
  })
  noRegLicenciaConstruccion: string | null;

  @Column('varchar', { name: 'CedulaProfesional', nullable: true, length: 30 })
  cedulaProfesional: string | null;

  @Column('datetime', { name: 'Fecha', nullable: true })
  fecha: Date | null;

  @Column('varchar', { name: 'NumeroExpediente', nullable: true, length: 50 })
  numeroExpediente: string | null;

  @Column('varchar', { name: 'NumeroControl', nullable: true, length: 50 })
  numeroControl: string | null;

  @Column('varchar', { name: 'SeguimientoObra', nullable: true, length: 50 })
  seguimientoObra: string | null;

  @Column('tinyint', { name: 'ConstanciaAlineamiento', nullable: true })
  constanciaAlineamiento: number | null;

  @Column('tinyint', { name: 'LicenciaUsoSuelo', nullable: true })
  licenciaUsoSuelo: number | null;

  @Column('tinyint', { name: 'PlanoAutorizado', nullable: true })
  planoAutorizado: number | null;

  @Column('tinyint', { name: 'LicenciaFraccionamiento', nullable: true })
  licenciaFraccionamiento: number | null;

  @Column('tinyint', { name: 'Escrituras', nullable: true })
  escrituras: number | null;

  @Column('tinyint', { name: 'FactibilidadAguaPotable', nullable: true })
  factibilidadAguaPotable: number | null;

  @Column('tinyint', { name: 'RecibosPagoPredial', nullable: true })
  recibosPagoPredial: number | null;

  @Column('tinyint', { name: 'RecibosMunicipales', nullable: true })
  recibosMunicipales: number | null;

  @Column('tinyint', { name: 'PlanoArquitectonicos', nullable: true })
  planoArquitectonicos: number | null;

  @Column('tinyint', { name: 'Otros', nullable: true })
  otros: number | null;

  @Column('datetime', {
    name: 'FechaCreacion',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @Column('datetime', {
    name: 'FechaActualizacion',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion: Date;

  @OneToOne(() => Registros, (registro) => registro.licenciaConstruccion, {
    onDelete: 'CASCADE',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn([
    {
      name: 'IdRegistro',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_LicenciaConstruccion_Registros',
    },
  ])
  idRegistro2: Registros;

  @OneToMany(
    () => Corresponsables,
    (corresponsable) => corresponsable.idLicenciaConstruccion2,
  )
  corresponsables: Corresponsables[];

  @OneToMany(
    () => FotosLicenciaConstruccion,
    (foto) => foto.idLicenciaConstruccion2,
  )
  fotos: FotosLicenciaConstruccion[];
}
