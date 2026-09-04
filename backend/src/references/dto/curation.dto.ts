import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsOptional, IsString, IsUUID, IsUrl, MaxLength, MinLength } from 'class-validator';

export class AddManualReferenceDto {
  @IsString() @MinLength(1) @MaxLength(300) title!: string;
  @IsString() @MaxLength(200) creator!: string;
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true }) @MaxLength(1000) url!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

export class AddLibraryReferenceDto {
  @IsUUID() trackId!: string;
}

export class ReplaceReferenceDto {
  @IsUUID() replacementId!: string;
}

export class SaveReferenceSelectionDto {
  @IsArray() @ArrayMaxSize(20) @ArrayUnique() @IsUUID('4', { each: true }) referenceIds!: string[];
  @IsBoolean() confirm!: boolean;
}
