import { jsonSerializer } from './json-serializer.js';

describe('json-serializer', () => {
  describe('jsonSerializer', () => {
    it('serializes JSON', () => {
      expect(jsonSerializer.serialize({ foo: 'bar' } as any))
          .toBe(JSON.stringify({ foo: 'bar' }));
    });

    it('deserializes JSON', () => {
      expect(jsonSerializer.deserialize('{ "foo": "bar" }'))
          .toEqual({ foo: 'bar' });
    });
  });
});
