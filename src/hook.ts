import { ComponentRef } from './component-ref.js';
import { ElementAccessor } from './element-accessor.js';

/** TODO: circular dependency on `ElementAccessor`? */
export type Hook<El extends Element, Result> =
    (comp: ComponentRef, el: ElementAccessor<El>) => Result;
