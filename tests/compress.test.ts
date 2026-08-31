// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

import {
  createImgCompress,
  getImgCompressInstance,
  resetImgCompressInstance,
} from '../src/utilities/compress.ts';

type ImageCtor = typeof Image;
type FileReaderCtor = typeof FileReader;

interface CanvasSnapshot {
  width: number;
  height: number;
  type: string | undefined;
  quality: number | undefined;
}

const originalImage = globalThis.Image;
const originalFileReader = globalThis.FileReader;
let canvasSnapshots: CanvasSnapshot[] = [];
let drawImage = vi.fn();

function flushMicrotasks(): Promise<void> {
  return Promise.resolve();
}

class MockImage {
  onload: ((event: Event) => void) | null = null;
  width = 1200;
  height = 600;

  set src(_value: string) {
    queueMicrotask(() => {
      this.onload?.({ target: this } as unknown as Event);
    });
  }
}

class MockFileReader {
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
  result: string | ArrayBuffer | null = null;

  readAsDataURL(_file: Blob): void {
    this.result = 'data:image/png;base64,cmVhZGVy';
    queueMicrotask(() => {
      this.onload?.({
        target: this,
      } as unknown as ProgressEvent<FileReader>);
    });
  }
}

beforeEach(() => {
  resetImgCompressInstance();
  canvasSnapshots = [];
  drawImage = vi.fn();
  vi.stubGlobal('Image', MockImage as unknown as ImageCtor);
  vi.stubGlobal('FileReader', MockFileReader as unknown as FileReaderCtor);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(
    function (
      this: HTMLCanvasElement,
      type?: string,
      quality?: number
    ): string {
      canvasSnapshots.push({
        width: this.width,
        height: this.height,
        type,
        quality,
      });
      return 'data:image/jpeg;base64,Y29tcHJlc3NlZA==';
    }
  );
});

afterEach(() => {
  resetImgCompressInstance();
  vi.restoreAllMocks();
  vi.stubGlobal('Image', originalImage);
  vi.stubGlobal('FileReader', originalFileReader);
});

describe('compress utilities', () => {
  it('converts a base64 data url to a typed Blob', async () => {
    const instance = createImgCompress(undefined, false);
    const blob = instance.convertBase64UrlToBlob(
      'data:text/plain;base64,aGVsbG8='
    );

    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe('text/plain');
    expect(blob?.size).toBe(5);
    await expect(blob?.text()).resolves.toBe('hello');
  });

  it('returns undefined when a data url has no mime segment', () => {
    const instance = createImgCompress(undefined, false);

    expect(instance.convertBase64UrlToBlob('aGVsbG8=')).toBeUndefined();
  });

  it('compresses an image path with configured width and derived height', async () => {
    const callback = vi.fn();
    const instance = createImgCompress({ quality: 0.8, width: 300 }, false);

    instance.canvasDataURL('data:image/png;base64,aW1hZ2U=', callback);
    await flushMicrotasks();

    expect(callback).toHaveBeenCalledWith(
      'data:image/jpeg;base64,Y29tcHJlc3NlZA=='
    );
    expect(canvasSnapshots).toEqual([
      {
        width: 300,
        height: 150,
        type: 'image/jpeg',
        quality: 0.8,
      },
    ]);
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(drawImage.mock.calls[0]?.slice(1)).toEqual([0, 0, 300, 150]);
  });

  it('uses explicit height when both width and height are configured', async () => {
    const callback = vi.fn();
    const instance = createImgCompress(
      { quality: 0.6, width: 400, height: 400 },
      false
    );

    instance.canvasDataURL('/photo.png', callback);
    await flushMicrotasks();

    expect(canvasSnapshots).toEqual([
      {
        width: 400,
        height: 400,
        type: 'image/jpeg',
        quality: 0.6,
      },
    ]);
  });

  it('reads a Blob before compressing it', async () => {
    const callback = vi.fn();
    const instance = createImgCompress({ width: 600 }, false);

    instance.photoCompress(
      new Blob(['image'], { type: 'image/png' }),
      callback
    );
    await flushMicrotasks();
    await flushMicrotasks();

    expect(callback).toHaveBeenCalledWith(
      'data:image/jpeg;base64,Y29tcHJlc3NlZA=='
    );
    expect(canvasSnapshots[0]).toMatchObject({
      width: 600,
      height: 300,
      quality: 0.7,
    });
  });

  it('reuses singleton instances unless explicitly disabled or reset', () => {
    const singleton = createImgCompress({ quality: 0.1 });
    const reused = createImgCompress({ quality: 0.9 });
    const fetched = getImgCompressInstance({ quality: 0.5 });
    const independent = createImgCompress({ quality: 0.9 }, false);

    expect(reused).toBe(singleton);
    expect(fetched).toBe(singleton);
    expect(independent).not.toBe(singleton);

    resetImgCompressInstance();
    expect(getImgCompressInstance()).not.toBe(singleton);
  });
});
