import { describe, expect, it } from 'vitest';
import {
  assertPrecacheContract,
  PRECACHE_CEILING_KIB,
  PRECACHE_SHAPES,
  precacheShape,
} from '../scripts/precacheContract.ts';

/**
 * The precache contract, which is what stops a chunk nothing imports being downloaded by every
 * visitor.
 *
 * The contract itself runs at build time — a `manifestTransforms` step, because that is the one
 * place Workbox's entries and their sizes are both in hand — and Vitest never builds, so the
 * assertion cannot be exercised through the build from here. What *can* be, and what these tests
 * cover, is the pure half: the hash-stripping, and the three conditions that throw.
 */

/** A content hash of the length and alphabet the build emits, standing in for a real one. */
const STAND_IN_HASH = 'BVKGSWc-';

/**
 * A shape turned back into a plausible built URL. `*` stands where the content hash goes.
 *
 * Every fixture below rests on one property — `precacheShape(urlFor(shape))` is `shape` again —
 * because `assertPrecacheContract` compares the shapes it strips from the URLs it is handed
 * against `PRECACHE_SHAPES`. A helper that breaks that property does not fail: it builds a URL the
 * contract reads back as some *other* shape, and the conforming manifest starts reporting a
 * `+`/`-` pair for a list nobody changed.
 *
 * A shape carries at most one `*`, because `precacheShape` strips exactly one hash. So the two
 * halves here are the whole of the property: `replaceAll` substitutes every `*` rather than the
 * first, and the round trip is checked rather than assumed, which is what catches a shape carrying
 * two — the case where no substitution can be faithful, and where a first-occurrence `replace`
 * would carry a literal `*` into a URL that still looks like a plausible name.
 */
function urlFor(shape: string): string {
  const url = shape.replaceAll('*', STAND_IN_HASH);
  const readBack = precacheShape(url);
  if (readBack !== shape) {
    throw new Error(
      `urlFor built ${url} from ${shape}, which precacheShape reads back as ${readBack}. ` +
        'A shape carries at most one * — the one hash precacheShape strips.',
    );
  }
  return url;
}

/** A manifest matching the contract exactly, at a size well under the ceiling. */
function conformingManifest(): { url: string; size: number }[] {
  return PRECACHE_SHAPES.map((shape) => ({ url: urlFor(shape), size: 1024 }));
}

describe('precacheShape', () => {
  it('strips the content hash from every hashed name the build actually emits', () => {
    expect(precacheShape('assets/index-CWZFRISS.css')).toBe('assets/index-*.css');
    expect(precacheShape('assets/sqliteWorker-D8hGV4Ts.js')).toBe('assets/sqliteWorker-*.js');
    expect(precacheShape('assets/sqlite3-opfs-async-proxy-D_xnb1D8.js')).toBe(
      'assets/sqlite3-opfs-async-proxy-*.js',
    );
    expect(precacheShape('assets/workbox-window.prod.es5-Bd17z0YL.js')).toBe(
      'assets/workbox-window.prod.es5-*.js',
    );
  });

  it('strips a hash whose last character is itself a hyphen', () => {
    // The reason the hash class has to include `-`. Narrow it to `[A-Za-z0-9_]` and this one
    // entry keeps its hash, so its shape changes on every rebuild and the contract fails at
    // random — while every other name still passes.
    expect(precacheShape('assets/sqlite3-BVKGSWc-.wasm')).toBe('assets/sqlite3-*.wasm');
  });

  it('leaves an unhashed name alone', () => {
    expect(precacheShape('index.html')).toBe('index.html');
    expect(precacheShape('404.html')).toBe('404.html');
    expect(precacheShape('coi-bootstrap.js')).toBe('coi-bootstrap.js');
    expect(precacheShape('icon-192.png')).toBe('icon-192.png');
    expect(precacheShape('favicon.ico')).toBe('favicon.ico');
    expect(precacheShape('manifest.webmanifest')).toBe('manifest.webmanifest');
  });

  it('does not mistake a short or long hyphenated segment for a hash', () => {
    expect(precacheShape('assets/thing-1234567.js')).toBe('assets/thing-1234567.js');
    expect(precacheShape('assets/thing-123456789.js')).toBe('assets/thing-123456789.js');
  });
});

describe('urlFor', () => {
  it('refuses a shape no single hash can stand in for', () => {
    // No substitution is faithful here, because `precacheShape` strips one hash and this shape
    // asks for two. The guard is what turns that into a stopped suite rather than a fixture the
    // contract quietly reads as a third shape.
    expect(() => urlFor('assets/index-*-*.js')).toThrow(/reads back as/);
  });

  it('substitutes every placeholder, and names the whole URL when it refuses one', () => {
    // The CodeQL alert this helper was fixed for, and the only assertion that can see it. The
    // refusal above fires under a first-occurrence `replace` too — a URL with a literal `*` left
    // in it does not read back as its shape either — so the throw alone separates nothing. What
    // separates them is the URL the refusal names: `replaceAll` reports a name with no `*` in it,
    // where `replace` reports one still carrying the second placeholder, which is a diagnostic a
    // reader would have to see through.
    expect(() => urlFor('assets/index-*-*.js')).toThrow(
      `urlFor built assets/index-${STAND_IN_HASH}-${STAND_IN_HASH}.js from assets/index-*-*.js`,
    );
  });
});

describe('assertPrecacheContract', () => {
  it('accepts a manifest that matches the listed shapes', () => {
    expect(() => {
      assertPrecacheContract(conformingManifest());
    }).not.toThrow();
  });

  it('rejects a chunk nobody listed, naming it', () => {
    // This is issue #122 itself: `@sqlite.org/sqlite-wasm`'s Worker1 promiser chunk, emitted
    // because its `defaultConfig` names a worker, precached because the glob walks `dist/`, and
    // loaded by nothing. Before the contract existed, it simply shipped.
    const withStrayChunk = [
      ...conformingManifest(),
      { url: 'assets/sqlite3-worker1-Co2MtQZd.js', size: 210_000 },
    ];
    expect(() => {
      assertPrecacheContract(withStrayChunk);
    }).toThrow(/\+ assets\/sqlite3-worker1-\*\.js \(precached, not listed\)/);
  });

  it('rejects a listed entry that stopped being precached, naming it', () => {
    const withoutBootstrap = conformingManifest().filter((entry) => entry.url !== 'coi-bootstrap.js');
    expect(() => {
      assertPrecacheContract(withoutBootstrap);
    }).toThrow(/- coi-bootstrap\.js \(listed, not precached\)/);
  });

  it('rejects a manifest over the size ceiling, and reports the figure', () => {
    const overCeiling = conformingManifest();
    const [first] = overCeiling;
    if (first === undefined) throw new Error('PRECACHE_SHAPES is empty');
    first.size = (PRECACHE_CEILING_KIB + 1) * 1024;
    expect(() => {
      assertPrecacheContract(overCeiling);
    }).toThrow(new RegExp(`over the ${PRECACHE_CEILING_KIB} KiB ceiling`));
  });

  it('measures the ceiling against the whole manifest, not the largest entry', () => {
    // Each entry is comfortably under the ceiling; together they are over it. A check written
    // per-entry would pass this.
    const manySmall = PRECACHE_SHAPES.map((shape) => ({
      url: urlFor(shape),
      size: Math.ceil(((PRECACHE_CEILING_KIB + 1) * 1024) / PRECACHE_SHAPES.length),
    }));
    expect(() => {
      assertPrecacheContract(manySmall);
    }).toThrow(/over the/);
  });
});
