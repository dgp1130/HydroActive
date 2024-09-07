import { Class } from './types.js';

describe('types', () => {
  describe('Class', () => {
    it('returns a class constructor of the given type', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        class Foo {
          public __brand = 'foo';
        }

        const Clazz = {} as Class<Foo>;

        new Clazz() satisfies Foo;
      };
    });
  });
});
