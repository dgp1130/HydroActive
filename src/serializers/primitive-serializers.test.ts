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

    it('deserializes a boolean from element text content', () => {
      const trueEl = document.createElement('div');
      trueEl.textContent = 'true';
      expect(booleanSerializer.deserializeFrom(trueEl)).toBeTrue();

      const falseEl = document.createElement('div');
      falseEl.textContent = 'false';
      expect(booleanSerializer.deserializeFrom(falseEl)).toBeFalse();
    });

    it('throws an error when deserializing any non-boolean value from element text content', () => {
      const el = document.createElement('div');

      el.textContent = '';
      expect(() => booleanSerializer.deserializeFrom(el)).toThrowError();

      el.textContent = 'not-true';
      expect(() => booleanSerializer.deserializeFrom(el)).toThrowError();

      el.textContent = 'TRUE';
      expect(() => booleanSerializer.deserializeFrom(el)).toThrowError();

      el.textContent = 'FALSE';
      expect(() => booleanSerializer.deserializeFrom(el)).toThrowError();
    });

    it('serializes a boolean to element text content', () => {
      const el = document.createElement('div');

      booleanSerializer.serializeTo(true, el)
      expect(el.textContent!).toBe('true');

      booleanSerializer.serializeTo(false, el);
      expect(el.textContent!).toBe('false');
    });
  });

  describe('numberSerializer', () => {
    it('deserializes numbers', () => {
      expect(numberSerializer.deserialize('1')).toBe(1);
    });

    it('serializes numbers', () => {
      expect(numberSerializer.serialize(1)).toBe('1');
    });

    it('deserializes numbers from element text content', () => {
      const el = document.createElement('div');
      el.textContent = '1';

      expect(numberSerializer.deserializeFrom(el)).toBe(1);
    });

    it('serializes numbers', () => {
      const el = document.createElement('div');

      numberSerializer.serializeTo(1, el);

      expect(el.textContent!).toBe('1');
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

    it('deserializes bigints from element text content', () => {
      const el = document.createElement('div');
      el.textContent = largeInt.toString();

      expect(bigintSerializer.deserializeFrom(el)).toBe(largeInt);
    });

    it('serializes bigints to element text content', () => {
      const el = document.createElement('div');

      bigintSerializer.serializeTo(largeInt, el);

      expect(el.textContent!).toBe(largeInt.toString());
    });
  });

  describe('stringSerializer', () => {
    it('deserializes strings', () => {
      expect(stringSerializer.deserialize('test')).toBe('test');
    });

    it('serializes strings', () => {
      expect(stringSerializer.serialize('test')).toBe('test');
    });

    it('deserializes strings from element text content', () => {
      const el = document.createElement('div');
      el.textContent = 'test';

      expect(stringSerializer.deserializeFrom(el)).toBe('test');
    });

    it('serializes strings to element text content', () => {
      const el = document.createElement('div');

      stringSerializer.serializeTo('test', el);

      expect(el.textContent!).toBe('test');
    });
  });
});
