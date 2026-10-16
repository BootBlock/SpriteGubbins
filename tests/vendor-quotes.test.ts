import { describe, expect, it } from 'vitest';

import { citedQuotations, type CitedQuotation } from '../scripts/citedQuotations.ts';
import { citedUrls } from '../scripts/citedUrls.ts';
import { commentRuns } from '../scripts/commentRuns.ts';
import { comparableWords } from '../scripts/comparableWords.ts';
import { fetchableUrl } from '../scripts/fetchPage.ts';
import { judgeQuotations } from '../scripts/judgeQuotations.ts';
import { pageText } from '../scripts/pageText.ts';
import { quotationFound } from '../scripts/quotationFound.ts';
import { quotationsIn } from '../scripts/quotationsIn.ts';
import { QUOTED_FROM_ELSEWHERE } from '../scripts/quotedFromElsewhere.ts';
import { appMarkup } from '../scripts/sourceFiles.ts';

/**
 * The offline half of `npm run check:vendor-quotes`: what it reads out of a comment and a page, and
 * how it decides a quotation is still there. The script itself needs the network and is not run
 * here, for the reason its docblock gives.
 */
describe('the quotations list', () => {
  it('excuses only quotations a comment that cites a URL still makes', () => {
    // An entry nothing quotes any more would excuse the next comment that quotes those words, which
    // is how an exemption list becomes the place stale quotations hide.
    const quoted = new Set(citedQuotations(appMarkup()).map(({ quotation }) => quotation));
    const unneeded = Object.keys(QUOTED_FROM_ELSEWHERE).filter((quotation) => !quoted.has(quotation));
    expect(unneeded).toStrictEqual([]);
  });
});

describe('commentRuns', () => {
  it('starts each run on its own line and strips the comment syntax from its prose', () => {
    const runs = commentRuns(
      ['const a = 1;', '/**', ' * One “quoted', ' * sentence”.', ' */', '', '// Two', '// lines.'].join('\n'),
    );
    expect(runs.map(({ line, prose }) => [line, prose])).toStrictEqual([
      [2, 'One “quoted sentence”.'],
      [7, 'Two lines.'],
    ]);
  });

  it('reads a // line inside a block comment as part of that block, not as a second run', () => {
    // A second run would pair the block's quotations with nothing and report them twice over.
    expect(commentRuns('/*\n// https://example.com/a\n */')).toHaveLength(1);
  });
});

describe('citedUrls', () => {
  it('drops the sentence punctuation after a URL and keeps a bracket the URL opens', () => {
    // Black Forest Labs' reference pages end in `[pro]`, and an earlier draft cut that URL at the
    // bracket, which fetched a page that does not exist.
    const prose =
      'See https://a.example/x-[pro] and (https://b.example/y). Also https://c.example/z’s, https://d.example/w.';
    expect(citedUrls(prose)).toStrictEqual([
      'https://a.example/x-[pro]',
      'https://b.example/y',
      'https://c.example/z’s',
      'https://d.example/w',
    ]);
  });
});

describe('quotationsIn', () => {
  it('reads both kinds of double quote, and a straight quote inside code as part of its span', () => {
    const prose = 'It said “set `background: "transparent"` to request one”, and "Instant" was GPT-5.5’s.';
    expect(quotationsIn(prose)).toStrictEqual(['set `background: "transparent"` to request one', 'Instant']);
  });

  it('reads no apostrophe as a quotation mark', () => {
    expect(quotationsIn('OpenAI’s page and Google’s page')).toStrictEqual([]);
  });
});

describe('pageText', () => {
  it('decodes character references and keeps adjacent elements as separate words', () => {
    const html = '<li>GPT&#8209;6</li><li>Sol&rsquo;s &amp; Luna&#x2019;s</li>';
    expect(comparableWords(pageText(html))).toBe(comparableWords('GPT‑6 Sol’s & Luna’s'));
    expect(comparableWords(pageText(html))).not.toContain('6sol');
  });

  it('reads text a framework ships inside a script as escaped strings', () => {
    const html =
      '<script>self.__next_f.push([1,"Most FLUX models don\\u2019t support \\"negative\\" prompts"])</script>';
    expect(
      quotationFound('Most FLUX models don’t support “negative” prompts', [comparableWords(pageText(html))]),
    ).toBe(true);
  });
});

describe('quotationFound', () => {
  const page = comparableWords(
    '<p>ChatGPT Images is available on all tiers. Images with thinking is on Plus.</p>',
  );

  it('ignores the markup, case and punctuation a comment lays over the words', () => {
    expect(quotationFound('ChatGPT Images is **available** on all tiers', [page])).toBe(true);
  });

  it('misses a quotation the page has reworded', () => {
    expect(quotationFound('ChatGPT Images is available on every tier', [page])).toBe(false);
  });

  it('finds an elided quotation only when every kept part is on the same page', () => {
    const other = comparableWords('Images with thinking is on Plus.');
    expect(quotationFound('ChatGPT Images … thinking is on Plus', [page])).toBe(true);
    expect(
      quotationFound('ChatGPT Images … thinking is on Plus', [comparableWords('ChatGPT Images'), other]),
    ).toBe(false);
  });
});

describe('judgeQuotations', () => {
  const cited = (quotation: string, urls: string[]): CitedQuotation => ({
    file: 'f.ts',
    line: 1,
    quotation,
    urls,
  });
  const pages = new Map([
    ['https://a.example', { words: comparableWords('The tool renders images.') }],
    ['https://b.example', { words: comparableWords('The model reasons first.') }],
    ['https://down.example', { words: null }],
  ]);

  it('checks a quotation against its own run’s pages only', () => {
    const { missing } = judgeQuotations([cited('The model reasons first', ['https://a.example'])], pages, {});
    expect(missing.map(({ quotation }) => quotation)).toStrictEqual(['The model reasons first']);
  });

  it('counts a quotation as missing when its only page did not load', () => {
    const { missing } = judgeQuotations(
      [cited('The tool renders images', ['https://down.example'])],
      pages,
      {},
    );
    expect(missing).toHaveLength(1);
  });

  it('excuses a listed quotation, and reports a listed one a page carries', () => {
    const listed = { 'was on the page once': 'Gone.', 'The tool renders images': 'Gone.' };
    const verdict = judgeQuotations(
      [
        cited('was on the page once', ['https://a.example']),
        cited('The tool renders images', ['https://a.example']),
      ],
      pages,
      listed,
    );
    expect(verdict.missing).toStrictEqual([]);
    expect(verdict.unneeded.map(({ quotation }) => quotation)).toStrictEqual(['The tool renders images']);
  });
});

describe('fetchableUrl', () => {
  it('fetches a GitHub blob as its raw file and leaves every other URL alone', () => {
    expect(fetchableUrl('https://github.com/openai/openai-openapi/blob/master/openapi.yaml')).toBe(
      'https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml',
    );
    expect(fetchableUrl('https://github.com/KohakuBlueleaf/PixelOE')).toBe(
      'https://github.com/KohakuBlueleaf/PixelOE',
    );
  });
});
