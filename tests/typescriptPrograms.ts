import { resolve } from 'node:path';
import * as ts from 'typescript';

/**
 * A host that throws on a config the compiler cannot read, rather than reporting it and going on
 * with a program it could not describe.
 */
export const CONFIG_HOST: ts.ParseConfigFileHost = {
  ...ts.sys,
  onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
    throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '));
  },
};

/**
 * The TypeScript programs `tsc -b` checks, as absolute paths to their configs.
 *
 * They are the projects `tsconfig.json` references, asked of the compiler rather than read out of
 * the JSON, so a reference is resolved exactly as the build resolves it. A guard that needs to know
 * what the type-check covers asks here, and so it cannot go on comparing a list of programs the
 * build has outgrown.
 */
export function typescriptPrograms(): string[] {
  const solution = ts.getParsedCommandLineOfConfigFile('tsconfig.json', undefined, CONFIG_HOST);
  const programs = solution?.projectReferences ?? [];
  if (programs.length === 0) throw new Error('tsconfig.json references no program');
  return programs.map(({ path }) => resolve(path));
}
