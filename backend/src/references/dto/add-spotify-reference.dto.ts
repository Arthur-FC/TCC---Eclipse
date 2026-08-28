import { IsString, IsUrl, MaxLength } from 'class-validator';

export class AddSpotifyReferenceDto {
  @IsString()
  @MaxLength(1_000)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url!: string;
}
