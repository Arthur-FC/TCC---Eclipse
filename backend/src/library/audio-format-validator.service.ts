import { Injectable } from '@nestjs/common';
import type { IAudioMetadata } from 'music-metadata';

type EsmLoader = (specifier: string) => Promise<unknown>;
const loadEsm = new Function(
  'specifier',
  'return import(specifier)',
) as EsmLoader;

@Injectable()
export class AudioFormatValidatorService {
  async matches(
    bytes: Uint8Array,
    contentType: string,
    sizeBytes: number,
  ): Promise<boolean> {
    try {
      const { parseBuffer } = await loadEsm('music-metadata') as {
        parseBuffer: (
          data: Uint8Array,
          fileInfo: { mimeType: string; size: number },
          options: { duration: boolean; skipCovers: boolean },
        ) => Promise<IAudioMetadata>;
      };
      const metadata = await parseBuffer(
        bytes,
        { mimeType: contentType, size: sizeBytes },
        { duration: false, skipCovers: true },
      );
      const container = (metadata.format.container ?? '').toLocaleLowerCase();
      const codec = (metadata.format.codec ?? '').toLocaleLowerCase();
      return contentType === 'audio/mpeg'
        ? container.includes('mpeg') ||
            codec.includes('layer 3') ||
            codec.includes('mp3')
        : container.includes('wave') || container.includes('wav');
    } catch {
      return false;
    }
  }
}
