import {
  Column,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { applySchema } from 'src/common/apply-schema.decorator';
import { CapturistaVisita } from './CapturistaVisita';
import { Catastro } from './Catastro';
import { ContactoRepresentante } from './ContactoRepresentante';
import { Contactos } from './Contactos';
import { Fotos } from './Fotos';
import { LicenciaConstruccion } from './LicenciaConstruccion';
import { Licencias } from './Licencias';
import { ProteccionCivil } from './ProteccionCivil';
import { Sapac } from './Sapac';

@applySchema
@Index('IX_Registros_Estatus', ['estatus'], {})
@Entity('Registros')
export class Registros {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('varchar', { name: 'Registro', nullable: true, length: 25 })
  registro: string | null;

  @Column('double', { name: 'Latitud', nullable: true })
  latitud: number | null;

  @Column('double', { name: 'Longitud', nullable: true })
  longitud: number | null;

  @Column('varchar', { name: 'EntidadFederativa', nullable: true, length: 100 })
  entidadFederativa: string | null;

  @Column('varchar', { name: 'Municipio', nullable: true, length: 100 })
  municipio: string | null;

  @Column('varchar', { name: 'Localidad', nullable: true, length: 100 })
  localidad: string | null;

  @Column('varchar', { name: 'Colonia', nullable: true, length: 100 })
  colonia: string | null;

  @Column('varchar', { name: 'Calle', nullable: true, length: 100 })
  calle: string | null;

  @Column('varchar', { name: 'NoInterior', nullable: true, length: 50 })
  noInterior: string | null;

  @Column('varchar', { name: 'NoExterior', nullable: true, length: 50 })
  noExterior: string | null;

  @Column('varchar', { name: 'CP', nullable: true, length: 45 })
  cp: string | null;

  @Column('tinyint', { name: 'TipoRegistro', nullable: true })
  tipoRegistro: number | null;

  @Column('tinyint', { name: 'PredioObra', nullable: true })
  predioObra: number | null;

  @Column('int', { name: 'Estatus', nullable: true })
  estatus: number | null;

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

  @OneToMany(() => CapturistaVisita, (visita) => visita.idRegistro2)
  capturistaVisitas: CapturistaVisita[];

  @OneToMany(() => Catastro, (catastro) => catastro.idRegistro2)
  catastros: Catastro[];

  @OneToMany(() => ContactoRepresentante, (contacto) => contacto.idRegistro2)
  contactosRepresentante: ContactoRepresentante[];

  @OneToMany(() => Contactos, (contacto) => contacto.idRegistro2)
  contactos: Contactos[];

  @OneToMany(() => Fotos, (foto) => foto.idRegistro2)
  fotos: Fotos[];

  @OneToOne(() => LicenciaConstruccion, (licencia) => licencia.idRegistro2)
  licenciaConstruccion: LicenciaConstruccion;

  @OneToMany(() => Licencias, (licencia) => licencia.idRegistro2)
  licencias: Licencias[];

  @OneToMany(() => ProteccionCivil, (pc) => pc.idRegistro2)
  proteccionCivil: ProteccionCivil[];

  @OneToMany(() => Sapac, (sapac) => sapac.idRegistro2)
  sapacs: Sapac[];
}
