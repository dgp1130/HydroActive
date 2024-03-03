/**
 * An implementation of the `defer-hydration` community protocol which provides
 * the name of the speaker in the underlying hydrated DOM.
 */
export class DeferredCompositionChild extends HTMLElement {
  // Implement `defer-hydration` community protocol.
  #hydrated = false;
  public static observedAttributes = ['defer-hydration'];
  public connectedCallback(): void {
    if (!this.hasAttribute('defer-hydration')) this.#hydrate();
  }
  public attributeChangedCallback(
      name: string, _oldValue: string | null, newValue: string | null): void {
    if (name === 'defer-hydration' && newValue === null) {
      this.#hydrate();
    }
  }

  // Hydrate some state.
  #speaker!: string;
  #hydrate(): void {
    if (this.#hydrated) return;
    this.#hydrated = true;

    this.#speaker = this.querySelector('span#subject')!.textContent!;
    console.log(`Hydrating ${this.#speaker}!`);
    this.querySelector('span#target')!.textContent = 'HydroActive';
  }

  // Return hydrated state.
  public getSpeakerName(): string {
    return this.#speaker;
  }
}

customElements.define('deferred-composition-child', DeferredCompositionChild);

declare global {
  interface HTMLElementTagNameMap {
    'deferred-composition-child': DeferredCompositionChild;
  }
}
