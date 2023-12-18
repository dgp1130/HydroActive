import { bigintSerializer, booleanSerializer, numberSerializer, stringSerializer } from './primitive-serializers.js';

describe('primitive-serializers', () => {
  describe('booleanSerializer', () => {
    it('deserializes booleans', () => {
      expect(booleanSerializer.deserialize('true')).toBeTrue();
      expect(booleanSerializer.deserialize('false')).toBeFalse();
    });

    it('throws an error when deserializing any non-boolean value', () => {
      expect(() => booleanSerializer.deserialize('')).toThrowError();
      expect(() => booleanSerializer.deserialize('not-true')).toThrowError();
      expect(() => booleanSerializer.deserialize('TRUE')).toThrowError();
      expect(() => booleanSerializer.deserialize('FALSE')).toThrowError();
    });

    it('serializes booleans', () => {
      expect(booleanSerializer.serialize(true)).toBe('true');
      expect(booleanSerializer.serialize(false)).toBe('false');
    });
  });

  describe('numberSerializer', () => {
    it('deserializes numbers', () => {
      expect(numberSerializer.deserialize('1')).toBe(1);
    });

    it('serializes numbers', () => {
      expect(numberSerializer.serialize(1)).toBe('1');
    });
  });

  describe('bigintSerializer', () => {
    // One larger than the maximum integer representable with the basic
    // `Number` type.
    const largeInt = BigInt(Number.MAX_SAFE_INTEGER) + 1n;

    it('deserializes bigints', () => {
      expect(bigintSerializer.deserialize(largeInt.toString())).toBe(largeInt);
    });

    it('serializes bigints', () => {
      expect(bigintSerializer.serialize(largeInt)).toBe(largeInt.toString());
    });
  });

  describe('stringSerializer', () => {
    it('deserializes strings', () => {
      expect(stringSerializer.deserialize('test')).toBe('test');
    });

    it('serializes strings', () => {
      expect(stringSerializer.serialize('test')).toBe('test');
    });
  });
});
