import { ElementSerializer } from '../serializers.js';

/** TODO */
export const valueSerializer:
    ElementSerializer<string, HTMLInputElement | HTMLSelectElement> = {
  deserializeFrom(element: HTMLSelectElement): string {
    return element.value;
  },

  serializeTo(value: string, element: HTMLSelectElement): void {
    element.value = value;
  },
};
