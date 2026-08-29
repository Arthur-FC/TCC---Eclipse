import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly signedUrlTtlSeconds: number;
  private bucketReady = false;

  constructor(configService: ConfigService) {
    this.bucket = configService.get<string>('STORAGE_BUCKET', 'eclipse-audio');
    this.signedUrlTtlSeconds = configService.get<number>(
      'STORAGE_SIGNED_URL_TTL_SECONDS',
      900,
    );
    this.client = new S3Client({
      endpoint: configService.get<string>(
        'STORAGE_ENDPOINT',
        'http://127.0.0.1:9000',
      ),
      region: configService.get<string>('STORAGE_REGION', 'us-east-1'),
      forcePathStyle: configService.get<boolean>(
        'STORAGE_FORCE_PATH_STYLE',
        true,
      ),
      credentials: {
        accessKeyId: configService.get<string>(
          'STORAGE_ACCESS_KEY',
          'eclipse_minio',
        ),
        secretAccessKey: configService.get<string>(
          'STORAGE_SECRET_KEY',
          'eclipse_minio_dev',
        ),
      },
    });
  }

  async createUploadUrl(
    key: string,
    contentType: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    await this.ensureBucket();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return {
      url: await getSignedUrl(this.client, command, {
        expiresIn: this.signedUrlTtlSeconds,
        signableHeaders: new Set(['content-type']),
      }),
      expiresInSeconds: this.signedUrlTtlSeconds,
    };
  }

  async createPlaybackUrl(
    key: string,
    filename: string,
    contentType: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    await this.ensureBucket();
    const safeFilename = filename.replace(/["\\\r\n]/g, '_');
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentType: contentType,
      ResponseContentDisposition: `inline; filename="${safeFilename}"`,
    });
    return {
      url: await getSignedUrl(this.client, command, {
        expiresIn: this.signedUrlTtlSeconds,
      }),
      expiresInSeconds: this.signedUrlTtlSeconds,
    };
  }

  async inspectObject(key: string): Promise<{
    sizeBytes: number;
    contentType: string;
    signature: Uint8Array;
  }> {
    await this.ensureBucket();
    try {
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const firstBytes = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Range: 'bytes=0-65535',
        }),
      );
      const signature = firstBytes.Body
        ? await firstBytes.Body.transformToByteArray()
        : new Uint8Array();
      return {
        sizeBytes: head.ContentLength ?? 0,
        contentType: head.ContentType ?? '',
        signature,
      };
    } catch {
      throw new BadGatewayException(
        'O arquivo enviado não foi encontrado no armazenamento.',
      );
    }
  }

  async computeSha256(key: string): Promise<string> {
    await this.ensureBucket();
    try {
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!object.Body) throw new Error('Objeto sem conteúdo.');
      const hash = createHash('sha256');
      const body = object.Body as AsyncIterable<Uint8Array>;
      for await (const chunk of body) hash.update(chunk);
      return hash.digest('hex');
    } catch {
      throw new BadGatewayException(
        'Não foi possível verificar a identidade do arquivo enviado.',
      );
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.ensureBucket();
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch {
      throw new BadGatewayException(
        'Não foi possível remover o arquivo do armazenamento.',
      );
    }
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketReady) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
      } catch (error) {
        const status = (error as { $metadata?: { httpStatusCode?: number } })
          .$metadata?.httpStatusCode;
        if (status !== 409) {
          throw new BadGatewayException(
            'O armazenamento de áudio está indisponível.',
          );
        }
      }
    }
    this.bucketReady = true;
  }
}
