declare module 'mhtml-to-html' {
  export function convert(input: Buffer | Uint8Array | string): Promise<string | Uint8Array | { html?: string } | unknown>;
}

declare module 'wkhtmltopdf' {
  import { Readable } from 'stream';
  function wkhtmltopdf(html: string, options?: Record<string, unknown>): Readable;
  export default wkhtmltopdf;
}

declare module 'html-pdf' {
  interface CreateOptions {
    format?: string;
    [key: string]: unknown;
  }
  interface Pdf {
    toFile(path: string, cb: (err: unknown, res?: unknown) => void): void;
  }
  const pdf: {
    create(html: string, options?: CreateOptions): Pdf;
  };
  export default pdf;
}


