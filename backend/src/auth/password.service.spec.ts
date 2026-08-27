import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies a password without storing the original value', async () => {
    const password = 'uma-senha-bem-segura';
    const hash = await service.hash(password);

    expect(hash).not.toContain(password);
    await expect(service.verify(password, hash)).resolves.toBe(true);
    await expect(service.verify('senha-incorreta', hash)).resolves.toBe(false);
  });

  it('rejects malformed hashes', async () => {
    await expect(service.verify('qualquer-senha', 'hash-invalido')).resolves.toBe(
      false,
    );
  });
});
