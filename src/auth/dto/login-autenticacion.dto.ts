import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CodigoPasajeroAutenticacion{

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
                description: 'Código de autenticación enviado al correo',
                example: '4821',
            })
    codigo:string;
}