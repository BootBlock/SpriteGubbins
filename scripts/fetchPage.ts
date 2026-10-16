import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

/** What one URL returned: the final HTTP status and address, and the body, or why there was none. */
export interface FetchedPage {
  /** The last response's status, or `null` when no response arrived at all. */
  readonly status: number | null;
  /** Where the redirects ended. */
  readonly finalUrl: string;
  readonly body: string;
  /** Why no response arrived, when none did. */
  readonly error?: string;
}

/** A current desktop browser, which is what every vendor page this repository cites is written for. */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

/**
 * What `curl` writes between the body and the final status and address. A command-line argument
 * cannot carry a NUL, so the marker is printable text that no page is likely to end with.
 */
const TRAILER = '\n<<curl-write-out>>';

/** The statuses worth one more attempt, because each says "not now" rather than "not here". */
const TRANSIENT = new Set([408, 425, 429, 500, 502, 503, 504]);

/** How many attempts a URL gets in all, and how long the pause before each retry grows by. */
const ATTEMPTS = 3;
const PAUSE_STEP_MS = 2000;

/**
 * The address to fetch for a cited `url`: GitHub's raw file rather than its blob page.
 *
 * A blob page renders a large file — OpenAI's `openapi.yaml` is one — as a notice that it is too
 * large to display, so the text a comment quotes is not on the page it cites. The raw file is the
 * same file at the same ref.
 */
export function fetchableUrl(url: string): string {
  return url.replace(
    /^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\//,
    'https://raw.githubusercontent.com/$1/',
  );
}

/**
 * Fetch `url` once with `curl`, as a desktop browser would ask for it.
 *
 * **`curl` rather than Node's `fetch`, because the vendors' front ends tell the two apart.** Measured
 * on 16 October 2026: `fetch` with the same user agent and headers received HTTP 403 from
 * `help.openai.com`, `openai.com/index/…` and every `docs.midjourney.com` article, and `curl`
 * received HTTP 200 from all of them. The refusal follows the client's TLS handshake, which no
 * header changes. `curl` ships with Windows 10 and later, macOS and every common Linux.
 *
 * `--cookie ""` switches on curl's cookie engine without reading a file. `ai.google.dev` sets a
 * cookie on its first response and redirects until it gets it back, which a client without cookies
 * follows until the redirect limit.
 */
async function fetchOnce(url: string): Promise<FetchedPage> {
  const args = ['--silent', '--show-error', '--location', '--compressed', '--max-time', '45'];
  const headers = ['Accept: text/html,application/xhtml+xml,*/*;q=0.8', 'Accept-Language: en-GB,en;q=0.9'];
  args.push('--cookie', '', '--user-agent', USER_AGENT, ...headers.flatMap((header) => ['--header', header]));
  args.push('--write-out', `${TRAILER}%{http_code} %{url_effective}`, fetchableUrl(url));

  try {
    const { stdout } = await promisify(execFile)('curl', args, {
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
    });
    const split = stdout.lastIndexOf(TRAILER);
    const [code = '', ...rest] = stdout.slice(split + TRAILER.length).split(' ');
    const status = Number(code);
    return { status: status === 0 ? null : status, finalUrl: rest.join(' '), body: stdout.slice(0, split) };
  } catch (error) {
    const stderr =
      typeof error === 'object' && error !== null && 'stderr' in error ? String(error.stderr) : '';
    return { status: null, finalUrl: url, body: '', error: stderr.trim() || String(error) };
  }
}

/** Fetch `url`, trying again after a pause when the answer was transient or there was none. */
export async function fetchPage(url: string): Promise<FetchedPage> {
  let page = await fetchOnce(url);
  for (
    let attempt = 1;
    attempt < ATTEMPTS && (page.status === null || TRANSIENT.has(page.status));
    attempt++
  ) {
    await new Promise((resolve) => setTimeout(resolve, PAUSE_STEP_MS * attempt));
    page = await fetchOnce(url);
  }
  return page;
}
