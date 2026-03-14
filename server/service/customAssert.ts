import assert from 'assert';

export class CustomError extends Error {}

export function customAssert(
  val: unknown,
  type: 'Eliminate fraudulent requests' | 'Fatal error requiring logic correction',
): asserts val {
  assert(val, new CustomError(type));
}
