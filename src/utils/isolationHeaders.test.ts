import { describe, expect, it } from 'vitest';
import { withIsolationHeaders } from './isolationHeaders.ts';

const ORIGIN = 'https://bootblock.github.io';
const APP = `${ORIGIN}/SpriteGubbins/`;

describe('withIsolationHeaders', () => {
  it('isolates a same-origin document', () => {
    const result = withIsolationHeaders(new Response('<!doctype html>'), APP, ORIGIN);

    expect(result.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(result.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
  });

  it('labels a same-origin subresource same-origin, never cross-origin', () => {
    // `cross-origin` is the grant COEP `require-corp` checks for, and it is what this worker used
    // to write onto everything. The app's own assets never needed it.
    const result = withIsolationHeaders(new Response('export {}'), `${APP}assets/index.js`, ORIGIN);

    expect(result.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
  });

  it('carries COEP on a worker script, not on the navigation alone', () => {
    // A dedicated worker created by a `require-corp` owner is blocked unless its own script
    // response says `require-corp`. This app starts four of them.
    const result = withIsolationHeaders(
      new Response('self.onmessage = () => {};'),
      `${APP}assets/sqliteWorker-D8hGV4Ts.js`,
      ORIGIN,
    );

    expect(result.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
  });

  it('adds nothing to a cross-origin response', () => {
    // The finding this module exists for: the worker is a proxy for the whole origin, and CORP is
    // another host's statement about its own resource. A response from a host that sets no CORP
    // reaches the page still setting none.
    const response = new Response('body { color: red }');
    const result = withIsolationHeaders(response, 'https://fonts.example.com/font.css', ORIGIN);

    expect(result).toBe(response);
    expect(result.headers.get('Cross-Origin-Resource-Policy')).toBeNull();
    expect(result.headers.get('Cross-Origin-Embedder-Policy')).toBeNull();
    expect(result.headers.get('Cross-Origin-Opener-Policy')).toBeNull();
  });

  it('treats a same-site subdomain as another origin', () => {
    const response = new Response('{}');
    const result = withIsolationHeaders(response, 'https://raw.bootblock.github.io/x.json', ORIGIN);

    expect(result).toBe(response);
    expect(result.headers.get('Cross-Origin-Resource-Policy')).toBeNull();
  });

  it('leaves an opaque or network-error response untouched', () => {
    // Status 0 has unreadable headers and a body that cannot be re-wrapped.
    const response = Response.error();

    expect(withIsolationHeaders(response, APP, ORIGIN)).toBe(response);
  });

  it('keeps the headers the response already carried', () => {
    const result = withIsolationHeaders(
      new Response('{}', { headers: { 'Content-Type': 'application/json' }, statusText: 'OK' }),
      `${APP}manifest.webmanifest`,
      ORIGIN,
    );

    expect(result.headers.get('Content-Type')).toBe('application/json');
    expect(result.status).toBe(200);
  });
});
