import { describe, expect, it } from 'vitest';
import { withIsolationHeaders } from './isolationHeaders.ts';

const ORIGIN = 'https://bootblock.github.io';
const APP = `${ORIGIN}/SpriteGubbins/`;

/**
 * A response that reports the URL it came from, as one from the network or the Cache API does.
 * `Response` has no constructor option for it, and `url` is the whole of what the gate reads.
 */
function servedFrom(url: string, response: Response): Response {
  Object.defineProperty(response, 'url', { value: url });
  return response;
}

describe('withIsolationHeaders', () => {
  it('isolates a same-origin document', () => {
    const result = withIsolationHeaders(servedFrom(APP, new Response('<!doctype html>')), ORIGIN);

    expect(result.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(result.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
  });

  it('labels a same-origin subresource same-origin, never cross-origin', () => {
    // `cross-origin` is the grant COEP `require-corp` checks for, and the value this worker wrote
    // onto everything. The app's own assets never needed it.
    const result = withIsolationHeaders(
      servedFrom(`${APP}assets/index.js`, new Response('export {}')),
      ORIGIN,
    );

    expect(result.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
  });

  it('carries COEP on a worker script, not on the navigation alone', () => {
    // A dedicated worker created by a `require-corp` owner is blocked unless its own script
    // response says `require-corp`. This app starts four of them.
    const result = withIsolationHeaders(
      servedFrom(`${APP}assets/sqliteWorker-D8hGV4Ts.js`, new Response('self.onmessage = () => {};')),
      ORIGIN,
    );

    expect(result.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
  });

  it('adds nothing to a cross-origin response', () => {
    // The worker is a proxy for the whole origin, and CORP is another host's statement about its
    // own resource. A response from a host that sets no CORP reaches the page still setting none.
    const response = servedFrom('https://fonts.example.com/font.css', new Response('body { color: red }'));
    const result = withIsolationHeaders(response, ORIGIN);

    expect(result).toBe(response);
    expect(result.headers.get('Cross-Origin-Resource-Policy')).toBeNull();
    expect(result.headers.get('Cross-Origin-Embedder-Policy')).toBeNull();
    expect(result.headers.get('Cross-Origin-Opener-Policy')).toBeNull();
  });

  it('treats a same-site subdomain as another origin', () => {
    const response = servedFrom('https://raw.bootblock.github.io/x.json', new Response('{}'));
    const result = withIsolationHeaders(response, ORIGIN);

    expect(result).toBe(response);
    expect(result.headers.get('Cross-Origin-Resource-Policy')).toBeNull();
  });

  it('adds nothing to another origin’s answer to a same-origin request', () => {
    // `fetch` follows redirects, so a same-origin URL can be answered off-origin. A worker judging
    // the request would label this one, which is the same overreach a URL further on.
    const response = servedFrom('https://cdn.example.com/third-party.js', new Response('globalThis.x = 1;'));
    const result = withIsolationHeaders(response, ORIGIN);

    expect(result).toBe(response);
    expect(result.headers.get('Cross-Origin-Resource-Policy')).toBeNull();
  });

  it('isolates a cached response, which reports the URL it was stored under', () => {
    const result = withIsolationHeaders(
      servedFrom(`${APP}index.html`, new Response('<!doctype html>')),
      ORIGIN,
    );

    expect(result.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
  });

  it('leaves a response built in code untouched, having no source to judge', () => {
    const response = new Response('{}');

    expect(response.url).toBe('');
    expect(withIsolationHeaders(response, ORIGIN)).toBe(response);
  });

  it('leaves an opaque response untouched', () => {
    // Status 0 has unreadable headers and a body that cannot be re-wrapped.
    const response = Response.error();

    expect(withIsolationHeaders(response, ORIGIN)).toBe(response);
  });

  it('keeps the headers the response already carried', () => {
    const result = withIsolationHeaders(
      servedFrom(
        `${APP}manifest.webmanifest`,
        new Response('{}', { headers: { 'Content-Type': 'application/json' }, statusText: 'OK' }),
      ),
      ORIGIN,
    );

    expect(result.headers.get('Content-Type')).toBe('application/json');
    expect(result.status).toBe(200);
  });
});
