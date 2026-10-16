import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The bug report's App version field shows the version the app is at.
 *
 * Its placeholder is the example a reporter sees before they type, and the version a release
 * publishes is `package.json`'s (`.github/workflows/deploy.yml`). The two were written separately,
 * so a version bump that missed the form left it naming a release that was no longer current, and
 * a reporter on the current one could read the example as a sign that they were out of date. The
 * 0.14.0 bump caught it by hand. This catches it on every bump.
 */
describe('the bug report form', () => {
  it('gives the version package.json declares as the App version placeholder', () => {
    const form = readFileSync(resolve(process.cwd(), '.github/ISSUE_TEMPLATE/bug_report.yml'), 'utf8');
    const { version } = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
      version: string;
    };

    const field = /^ {2}- type: input\r?\n {4}id: version\r?\n(?: {4,}.*\r?\n)*/m.exec(form)?.[0];
    expect(field, 'The form has no input with the id `version`.').toBeDefined();

    const placeholder = /^ {6}placeholder: (.+?)\s*$/m.exec(field ?? '')?.[1];
    expect(placeholder, 'Write the version package.json declares into the App version placeholder.').toBe(
      version,
    );
  });
});
