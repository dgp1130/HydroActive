/** @fileoverview Collection of simple type utilities. */

/**
 * Analogous to `Class<T>` in Java. Represents the class object of the given
 * instance type.
 */
export type Class<Instance> = { new(): Instance };
