import { ComponentRef } from './component-ref.js';
import { Dehydrated } from './dehydrated.js';
import { Hook } from './hook.js';
import { QueriedElement } from './query.js';
import { Queryable, queryEl } from './queryable.js';
import { ElementSerializerToken, ResolveSerializer, resolveSerializer } from './serializer-tokens.js';
import { ElementSerializable, ElementSerializer, Serialized } from './serializers.js';
import { Signal, WriteableSignal, signal } from './signals.js';

function isCustomElement(el: Element): boolean {
  return el.tagName.includes('-');
}

function isDefined(el: Element): boolean {
  return Boolean(customElements.get(el.tagName.toLowerCase()));
}

function isHydrated(el: Element): boolean {
  return !el.hasAttribute('defer-hydration');
}

/** TODO */
export class ElementAccessor<El extends Element> implements Queryable<El> {
  protected constructor(public readonly native: El) {}

  /** TODO */
  public static from<El extends Element>(
    native: El,
    elementClass?: typeof Element,
  ): ElementAccessor<El> {
    if (isCustomElement(native)) {
      if (!elementClass) {
        throw new Error('An element class is required for custom elements.'); // TODO
      }

      if (!isDefined(native)) {
        throw new Error('Custom element not defined.'); // TODO
      }

      if (!(native instanceof elementClass)) {
        throw new Error('Does not extend element class'); // TODO
      }

      if (!isHydrated(native)) {
        throw new Error('Not hydrated.'); // TODO
      }
    }

    return new ElementAccessor(native);
  }

  /** TODO */
  public query<Selector extends string>(selector: Selector):
      Dehydrated<QueriedElement<Selector, El>> {
    const result = queryEl(this.native, selector);
    return Dehydrated.from(result);
  }

  /** TODO */
  public read<Token extends ElementSerializerToken<any, El>>(token: Token):
      Serialized<ResolveSerializer<
        Token,
        ElementSerializer<unknown, El>,
        ElementSerializable<unknown, El>
      >> {
    const serializer = resolveSerializer<
      Token,
      ElementSerializer<unknown, El>,
      ElementSerializable<unknown, El>
    >(token);

    return serializer.deserializeFrom(this.native);
  }

  /** TODO: rename? */
  public use<Result>(comp: ComponentRef, hook: Hook<El, Result>): Result {
    return hook(comp, this);
  }

  /** TODO */
  public live<Token extends ElementSerializerToken<any, El>>(
    comp: ComponentRef,
    token: Token,
  ): WriteableSignal<Serialized<ResolveSerializer<
    Token,
    ElementSerializer<unknown, El>,
    ElementSerializable<unknown, El>
  >>> {
    const serializer = resolveSerializer(token);
    const initial = this.read(serializer);
    const value = signal(initial);

    this.bind(comp, serializer as any, () => value());

    return value as any /* TODO */;
  }

  /** TODO */
  public bind<
    Value,
    Token extends ElementSerializerToken<Value, El>
  >(comp: ComponentRef, token: Token, signal: Signal<Value>): void {
    const serializer = resolveSerializer(token) as ElementSerializer<Value, El>;
    comp.effect(() => {
      const value = signal();

      serializer.serializeTo(value, this.native);
    });
  }
}
