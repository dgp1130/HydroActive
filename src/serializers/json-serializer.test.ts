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

    it('serializes JSON to element text content', () => {
      const el = document.createElement('div');

      jsonSerializer.serializeTo({ foo: 'bar' } as any, el);

      expect(el.textContent!).toBe(JSON.stringify({ foo: 'bar' }));
    });

    it('deserializes JSON from element text content', () => {
      const el = document.createElement('div');
      el.textContent = '{ "foo": "bar" }';

      expect(jsonSerializer.deserializeFrom(el)).toEqual({ foo: 'bar' });
    });
  });
});
