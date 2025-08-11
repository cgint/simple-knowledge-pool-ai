declare module 'mhtml-to-html' {
  export function convert(input: Buffer | Uint8Array | string): Promise<string | Uint8Array | { html?: string } | unknown>;
}

declare module 'wkhtmltopdf' {
  import { Readable } from 'stream';
  function wkhtmltopdf(html: string, options?: Record<string, unknown>): Readable;
  export default wkhtmltopdf;
}


