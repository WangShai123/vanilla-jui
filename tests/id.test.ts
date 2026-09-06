import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { hashQueryParams } from '../src/utilities/id.ts';

const originalCrypto = globalThis.crypto;

function cryptoWithSubtle(subtle: unknown): Crypto {
  return new Proxy(originalCrypto, {
    get(target, property, receiver) {
      if (property === 'subtle') return subtle;
      return Reflect.get(target, property, receiver);
    },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('crypto', originalCrypto);
});

describe('hashQueryParams', () => {
  it('uses Web Crypto SHA-256 when crypto.subtle is available', async () => {
    const digest = vi.fn<SubtleCrypto['digest']>(
      async () => Uint8Array.from([0x01, 0x02, 0x03, 0x04]).buffer
    );
    vi.stubGlobal('crypto', cryptoWithSubtle({ digest }));

    await expect(hashQueryParams({ page: 1 }, 4)).resolves.toBe('a2f44');
    expect(digest).toHaveBeenCalledTimes(1);
    expect(digest.mock.calls[0]?.[0]).toBe('SHA-256');
    expect(
      Array.from(new Uint8Array(digest.mock.calls[0]?.[1] as ArrayBuffer))
    ).toEqual(Array.from(new TextEncoder().encode('{"page":1}')));
  });

  it('falls back to a browser-safe SHA-256 implementation without crypto.subtle', async () => {
    vi.stubGlobal('crypto', cryptoWithSubtle(undefined));

    await expect(hashQueryParams({ sort: ' desc ', page: 1 })).resolves.toBe(
      '3joqbu1s3dd84'
    );
  });

  it('falls back when crypto is unavailable', async () => {
    vi.stubGlobal('crypto', undefined);

    await expect(hashQueryParams({ page: 1 }, 4)).resolves.toBe('vcj3ph');
  });

  it('keeps key sorting and string trimming deterministic', async () => {
    vi.stubGlobal('crypto', undefined);

    await expect(hashQueryParams({ page: 1, sort: 'desc' })).resolves.toBe(
      await hashQueryParams({ sort: ' desc ', page: 1 })
    );
  });

  it('validates inputs before hashing', async () => {
    await expect(hashQueryParams(null as never)).rejects.toThrow(
      'params must be a non-null object'
    );
    await expect(hashQueryParams({}, 0)).rejects.toThrow(
      'bytes must be between 1 and 32'
    );
    await expect(hashQueryParams({}, 33)).rejects.toThrow(
      'bytes must be between 1 and 32'
    );
  });
});
