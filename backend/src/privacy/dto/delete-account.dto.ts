import { Equals, IsString, MaxLength, MinLength } from 'class-validator';

export class DeleteAccountDto {
  @IsString()
  @Equals('EXCLUIR', { message: 'Digite EXCLUIR para confirmar a remoção definitiva.' })
  confirmation!: 'EXCLUIR';

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
