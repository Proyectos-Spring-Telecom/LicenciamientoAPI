import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { applySchema } from 'src/common/apply-schema.decorator';
import { Fotos } from './Fotos';
import { FotosLicenciaConstruccion } from './FotosLicenciaConstruccion';

@applySchema
@Entity('TipoFoto')
export class TipoFoto {
  @PrimaryGeneratedColumn({ type: 'int', name: 'Id' })
  id: number;

  @Column('varchar', { name: 'Nombre', length: 500 })
  nombre: string;

  @OneToMany(() => Fotos, (foto) => foto.idTipoFoto2)
  fotos: Fotos[];

  @OneToMany(() => FotosLicenciaConstruccion, (foto) => foto.idTipoFoto2)
  fotosLicenciaConstruccion: FotosLicenciaConstruccion[];
}
