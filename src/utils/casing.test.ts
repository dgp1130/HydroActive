import { skewerCaseToPascalCase } from './casing.js';

describe('casing', () => {
  describe('skewerCaseToPascalCase', () => {
    it('converts `skewer-case` inputs to `PascalCase`', () => {
      expect(skewerCaseToPascalCase('foo-bar-baz')).toBe('FooBarBaz');
    });

    it('ignores leading and trailing dashes', () => {
      expect(skewerCaseToPascalCase('---foo-bar---')).toBe('FooBar');
    });

    it('collapses duplicate dashes', () => {
      expect(skewerCaseToPascalCase('foo------bar')).toBe('FooBar');
    });

    it('converts inputs without a dash', () => {
      expect(skewerCaseToPascalCase('foo')).toBe('Foo');
    });

    it('converts inputs with a one-character word', () => {
      expect(skewerCaseToPascalCase('a-b-c')).toBe('ABC');
    });
  });
});
