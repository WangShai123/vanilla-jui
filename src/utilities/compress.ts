export interface CompressOptions {
  /** 压缩质量，范围 0-1，默认 0.7 */
  quality?: number;
  /** 目标宽度（像素），不指定则按原图比例缩放 */
  width?: number;
  /** 目标高度（像素），不指定则按原图比例缩放 */
  height?: number;
}

export interface ImgCompressInstance {
  /**
   * 将图片路径转换为压缩后的 base64 数据
   * @param path - 图片文件路径或 base64 字符串
   * @param callback - 压缩完成后的回调函数，接收 base64 字符串作为参数
   */
  canvasDataURL: (path: string, callback: (base64: string) => void) => void;

  /**
   * 压缩文件对象
   * @param file - 文件对象（Blob 或 File）
   * @param callback - 压缩完成后的回调函数，接收 base64 字符串作为参数
   */
  photoCompress: (file: Blob, callback: (base64: string) => void) => void;

  /**
   * 将 base64 字符串转换为 Blob 对象
   * @param urlData - base64 数据（包含 data:image 前缀）
   * @returns Blob 对象，如果解析失败则返回 undefined
   */
  convertBase64UrlToBlob: (urlData: string) => Blob | undefined;
}

/** 单例缓存 */
let singletonInstance: ImgCompressInstance | null = null;

/**
 * 将 base64 字符串转换为 Blob 对象
 * @param urlData - base64 数据（包含 data:image 前缀）
 * @returns Blob 对象，如果解析失败则返回 undefined
 */
function convertBase64UrlToBlob(urlData: string): Blob | undefined {
  const arr = urlData.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) return;

  const mime = mimeMatch[1];
  const binaryString = atob(arr[1]);
  const length = binaryString.length;
  const uint8Array = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }

  return new Blob([uint8Array], { type: mime });
}

/**
 * 创建压缩实例的核心工厂函数
 */
function createCompressInstance(
  options?: CompressOptions
): ImgCompressInstance {
  const { quality = 0.7, width, height } = options ?? {};
  const config = { quality, width, height };

  return {
    canvasDataURL(path: string, callback: (base64: string) => void): void {
      const img = new Image();
      img.src = path;

      img.onload = (e: Event): void => {
        const target = e.target as HTMLImageElement;
        const { width: originalWidth, height: originalHeight } = target;
        const scale = originalWidth / originalHeight;

        const w = config.width ?? originalWidth;
        const h = config.height ?? w / scale;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = w;
        canvas.height = h;

        ctx?.drawImage(target, 0, 0, w, h);

        const base64 = canvas.toDataURL('image/jpeg', config.quality);
        callback(base64);
      };
    },

    photoCompress(file: Blob, callback: (base64: string) => void): void {
      const reader = new FileReader();

      reader.readAsDataURL(file);

      reader.onload = (event: ProgressEvent<FileReader>): void => {
        const result = event.target?.result as string;
        this.canvasDataURL(result, callback);
      };
    },

    convertBase64UrlToBlob,
  };
}

// ==================== public api ====================

/**
 * 创建图片压缩实例
 * @param options - 压缩配置选项
 * @param singleton - 是否返回单例，默认 true
 * @returns 图片压缩实例
 * @example
 * ```ts
 * // 获取单例实例（默认）
 * const imgzip = createImgCompress({ quality: 0.8, width: 800 });
 *
 * // 创建新实例
 * const imgzip2 = createImgCompress({ quality: 0.9 }, false);
 * ```
 */
function createImgCompress(
  options?: CompressOptions,
  singleton: boolean = true
): ImgCompressInstance {
  if (singleton && singletonInstance) {
    return singletonInstance;
  }

  const instance = createCompressInstance(options);

  if (singleton) {
    singletonInstance = instance;
  }

  return instance;
}

/**
 * 获取单例实例（如果不存在则创建）
 * @param options - 压缩配置选项（仅在首次创建时生效）
 * @returns 单例实例
 * @example
 * ```ts
 * const imgzip = getImgCompressInstance({ quality: 0.8 });
 * ```
 */
function getImgCompressInstance(
  options?: CompressOptions
): ImgCompressInstance {
  if (!singletonInstance) {
    singletonInstance = createCompressInstance(options);
  }
  return singletonInstance;
}

/**
 * 重置单例实例（用于测试或重新配置）
 */
function resetImgCompressInstance(): void {
  singletonInstance = null;
}

export { createImgCompress, getImgCompressInstance, resetImgCompressInstance };
export default createImgCompress;
