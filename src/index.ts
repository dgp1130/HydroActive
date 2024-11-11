export { AttrAccessor } from './attribute-accessor.js';
export { type BaseHydrateLifecycle, defineBaseComponent } from './base-component.js';
export { type SignalHydrateLifecycle, defineSignalComponent } from './signal-component.js';
export { Component, type ComponentHost, type Descriptor, type Initializer, type PropertyFactory, type ProxyDescriptor, type ValueDescriptor, required, query, hydrate as hydrateEl, use, define, customElement } from './component-class.js';
export { type Connectable, type OnConnect, type OnDisconnect } from './connectable.js';
export { Dehydrated } from './dehydrated.js';
export { ElementAccessor } from './element-accessor.js';
export { ReactiveValue, getReactiveValue, reactive } from './reactive-value.js';
export { type Queryable } from './queryable.js';
export { QueryRoot } from './query-root.js';
export { type Properties, hydrate, isHydrated } from './hydration.js';

// Only export the `ComponentAccessor` object types because consumers should not
// construct these objects directly as doing so would leak internal details
// about components such as a closed shadow root.
export { type ComponentAccessor } from './component-accessor.js';
export { type SignalComponentAccessor } from './signal-component-accessor.js';
