/**
 * A growable little-endian byte buffer, for writing a binary file field by field.
 *
 * Written for the `.aseprite` writer, which is a long sequence of `WORD`s, `DWORD`s and `STRING`s
 * with no length known in advance: a cel's size depends on what deflate makes of it, and a chunk's
 * size has to be written *before* the chunk it measures. Assembling that with a `DataView` per
 * structure means an offset counter beside every field, and an off-by-one in one of them shifts
 * every byte after it — a file that opens as garbage rather than failing anywhere near the mistake.
 *
 * **Little-endian, always.** The Aseprite format specification's References section states the whole
 * file is in Intel byte order, so there is no big-endian form of any of these and no argument to
 * take one. That is the one respect in which this is not a general-purpose writer, and it is why it
 * is not shared with `pngChunk.ts`, whose lengths and CRCs are big-endian by PNG's own §5.
 *
 * Pure, as everything in this directory is: no document, no store, no I/O.
 */

/** How much room a fresh writer takes, doubling from there as it is filled. */
const INITIAL_CAPACITY = 256;

export class ByteWriter {
  private buffer: Uint8Array<ArrayBuffer>;
  private view: DataView;
  private at = 0;

  constructor(capacity: number = INITIAL_CAPACITY) {
    this.buffer = new Uint8Array(Math.max(1, capacity));
    this.view = new DataView(this.buffer.buffer);
  }

  /** How many bytes have been written — which is also where the next one lands. */
  get length(): number {
    return this.at;
  }

  u8(value: number): this {
    this.room(1);
    this.view.setUint8(this.at, value);
    this.at += 1;
    return this;
  }

  u16(value: number): this {
    this.room(2);
    this.view.setUint16(this.at, value, true);
    this.at += 2;
    return this;
  }

  /** `SHORT` — the signed 16-bit form a cel's position is written in. */
  i16(value: number): this {
    this.room(2);
    this.view.setInt16(this.at, value, true);
    this.at += 2;
    return this;
  }

  u32(value: number): this {
    this.room(4);
    this.view.setUint32(this.at, value, true);
    this.at += 4;
    return this;
  }

  /** The format's reserved runs, which it asks to be set to zero rather than left as they were. */
  zeros(count: number): this {
    this.room(count);
    this.buffer.fill(0, this.at, this.at + count);
    this.at += count;
    return this;
  }

  bytes(source: Uint8Array): this {
    this.room(source.length);
    this.buffer.set(source, this.at);
    this.at += source.length;
    return this;
  }

  /**
   * `STRING` — a `WORD` byte length followed by that many UTF-8 bytes, with no terminator.
   *
   * The length is of the **bytes**, not of the characters, which the specification states and which
   * differ for every name outside ASCII. Encoding first and measuring the result is what keeps the
   * two from being two different numbers.
   */
  text(value: string): this {
    const encoded = new TextEncoder().encode(value);
    return this.u16(encoded.length).bytes(encoded);
  }

  /**
   * Overwrite a `DWORD` already written, which is how a size that is only known afterwards is
   * stated in front of what it measures — a file's own length, and each frame's.
   */
  patchU32(at: number, value: number): this {
    this.view.setUint32(at, value, true);
    return this;
  }

  /** The bytes written, as their own array rather than a view onto the writer's spare room. */
  toBytes(): Uint8Array<ArrayBuffer> {
    return this.buffer.slice(0, this.at);
  }

  private room(bytes: number): void {
    if (this.at + bytes <= this.buffer.length) return;
    let capacity = this.buffer.length;
    while (capacity < this.at + bytes) capacity *= 2;
    const grown = new Uint8Array(capacity);
    grown.set(this.buffer);
    this.buffer = grown;
    this.view = new DataView(grown.buffer);
  }
}
