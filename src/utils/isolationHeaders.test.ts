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
  it.each([
    // The navigation itself, which is what COOP is read from.
    ['a same-origin document', APP, '<!doctype html>'],
    // `cross-origin` is the grant COEP `require-corp` checks for, and the value this worker wrote
    // onto everything. The app's own assets never needed it: they are labelled `same-origin`.
    ['a same-origin subresource', `${APP}assets/index.js`, 'export {}'],
    // A dedicated worker created by a `require-corp` owner is blocked unless its own script
    // response says `require-corp`, so COEP goes on more than the navigation. This app starts four.
    ['a worker script', `${APP}assets/sqliteWorker-D8hGV4Ts.js`, 'self.onmessage = () => {};'],
    // A cache hit reports the URL it was stored under, which is what the gate reads.
    ['a cached response', `${APP}index.html`, '<!doctype html>'],
  ])('isolates %s, labelling it same-origin', (_name, url, body) => {
    const result = withIsolationHeaders(servedFrom(url, new Response(body)), ORIGIN);

    expect(result.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(result.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
    expect(result.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
  });

  it.each([
    // The worker is a proxy for the whole origin, and CORP is another host's statement about its
    // own resource. A response from a host that sets no CORP reaches the page still setting none.
    ['a cross-origin response', 'https://fonts.example.com/font.css', 'body { color: red }'],
    ['a same-site subdomain, which is another origin', 'https://raw.bootblock.github.io/x.json', '{}'],
    // `fetch` follows redirects, so a same-origin URL can be answered off-origin. A worker judging
    // the request would label this one, which is the same overreach a URL further on.
    [
      'another origin’s answer to a same-origin request',
      'https://cdn.example.com/third-party.js',
      'globalThis.x = 1;',
    ],
  ])('adds nothing to %s', (_name, url, body) => {
    const response = servedFrom(url, new Response(body));
    const result = withIsolationHeaders(response, ORIGIN);

    expect(result).toBe(response);
    expect(result.headers.get('Cross-Origin-Resource-Policy')).toBeNull();
    expect(result.headers.get('Cross-Origin-Embedder-Policy')).toBeNull();
    expect(result.headers.get('Cross-Origin-Opener-Policy')).toBeNull();
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
    expect(result.statusText).toBe('OK');
  });
});
