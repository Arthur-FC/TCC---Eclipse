import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const HASH_VERSION = '1';

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await this.deriveKey(password, salt);

    return `scrypt$${HASH_VERSION}$${salt}$${derivedKey.toString('hex')}`;
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const [algorithm, version, salt, hash] = storedHash.split('$');

    if (
      algorithm !== 'scrypt' ||
      version !== HASH_VERSION ||
      !salt ||
      !hash
    ) {
      return false;
    }

    const storedKey = Buffer.from(hash, 'hex');
    if (storedKey.length !== KEY_LENGTH) {
      return false;
    }

    const suppliedKey = await this.deriveKey(password, salt);
    return timingSafeEqual(storedKey, suppliedKey);
  }

  private deriveKey(password: string, salt: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      });
    });
  }
}
