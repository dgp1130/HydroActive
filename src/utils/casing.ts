/** @fileoverview Collection of utilities around naming and casing. */

/**
 * Converts a `skewer-case` term into `PascalCase` format.
 *
 * @param skewerCase A string in `skewer-case` format.
 * @returns The input in `PascalCase` format.
 */
export function skewerCaseToPascalCase(skewerCase: string): string {
  return skewerCase.split('-')
      .map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`)
      .join('');
}
