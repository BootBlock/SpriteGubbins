/**
 * Deflate, from the browser rather than from a dependency.
 *
 * `CompressionStream('deflate')` produces a **zlib** stream — RFC 1950's two-byte header, the
 * RFC 1951 deflate data, and an Adler-32 trailer — which is exactly what a PNG `IDAT` payload is
 * defined to hold. (`'deflate-raw'` is the bare RFC 1951 form and would produce a file no decoder
 * opens.) Supported in every browser this app targets, and in Node, which is what lets the encoder's
 * tests deflate and inflate for real rather than against a stub.
 *
 * In `src/utils/` and still pure in the sense this directory means: a function of its argument, with
 * no store, no document and no I/O. It is asynchronous because the platform's compressor is, not
 * because it is waiting on anything outside the process.
 */
export async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
