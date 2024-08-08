import { Queryable } from './queryable.js';

describe('queryable', () => {
  describe('Queryable', () => {
    describe('query', () => {
      it('type checks the result by parsing the selector query', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const queryable = {} as Queryable<Element>;
          const result = queryable.query('.foo #bar > [baz] input');

          result satisfies Queryable<HTMLInputElement>;
        };
      });

      it('returns a non-nullish value by default', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const queryable = {} as Queryable<Element>;
          const result = queryable.query('input');

          // @ts-expect-error
          null satisfies typeof result;
        };
      });

      it('returns a non-nullish value when explicitly not optional', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const queryable = {} as Queryable<Element>;
          const result = queryable.query('input', { optional: false });

          // @ts-expect-error
          null satisfies typeof result;
        };
      });

      it('returns a nullish value when explicitly optional', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const queryable = {} as Queryable<Element>;
          const result = queryable.query('input', { optional: true });

          null satisfies typeof result;
        };
      });

      it('returns a nullish value when optionality is unknown', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const queryable = {} as Queryable<Element>;
          const optional = false as boolean;
          const result = queryable.query('input', { optional });

          null satisfies typeof result;
        };
      });

      it('can query a shadow root', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const queryable = {} as Queryable<ShadowRoot>;
          const result = queryable.query('input');

          result satisfies Queryable<HTMLInputElement>;
        };
      });
    });

    describe('queryAll', () => {
      it('type checks the result by parsing the selector query', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const queryable = {} as Queryable<Element>;
          const result = queryable.queryAll('.foo #bar > [baz] input');

          result satisfies Array<Queryable<HTMLInputElement>>;
        };
      });

      it('can query a shadow root', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const queryable = {} as Queryable<ShadowRoot>;
          const result = queryable.queryAll('input');

          result satisfies Array<Queryable<HTMLInputElement>>;
        };
      });
    });
  });
});
