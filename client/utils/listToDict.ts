export const listToDict = <T extends readonly [string, ...string[]]>(
  list: T,
): { [U in T[number]]: U } =>
  list.reduce((dict, type) => ({ ...dict, [type]: type }), {} as { [U in T[number]]: U });
