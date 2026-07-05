declare module 'archiver' {
  import { Transform } from 'stream';
  interface ZipArchiveOptions { zlib?: { level?: number }; store?: boolean }
  export class ZipArchive extends Transform {
    constructor(options?: ZipArchiveOptions);
    append(source: Buffer | string, data: { name: string }): this;
    finalize(): void;
  }
}
