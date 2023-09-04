import { ComponentDef, component, hydrate } from 'hydroactive';

const NoProps = component('no-props', ($) => {});

declare global {
  interface HTMLElementTagNameMap {
    'no-props': InstanceType<typeof NoProps>;
  }
}

const WithProps = component('with-props', ($: ComponentDef<{ foo: string }>) => {});

declare global {
  interface HTMLElementTagNameMap {
    'with-props': InstanceType<typeof WithProps>;
  }
}

describe('Props', () => {
  it('types components without props correctly', () => {
    // Type-only test, nothing to actually execute.
    () => {
      const noPropsEl = document.createElement('no-props');

      () => hydrate(noPropsEl, NoProps);
      () => hydrate(noPropsEl, NoProps, {});
      // @ts-expect-error
      () => hydrate(noPropsEl, NoProps, { foo: 'bar' });
    };

    expect().nothing();
  });

  it('types components with props correctly', () => {
    // Type-only test, nothing to actually execute.
    () => {
      const withPropsEl = document.createElement('with-props');
      hydrate(withPropsEl, WithProps, { foo: 'foo' });
      // @ts-expect-error No props.
      hydrate(withPropsEl, WithProps);
      // @ts-expect-error Empty props.
      hydrate(withPropsEl, WithProps, { });
      // @ts-expect-error Wrong prop type.
      hydrate(withPropsEl, WithProps, { foo: 1 });
      // @ts-expect-error Extra props.
      hydrate(withPropsEl, WithProps, { foo: 'foo', bar: 'bar' });
    };

    expect().nothing();
  });
});
