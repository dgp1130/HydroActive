/**
 * @fileoverview Defines an effect, which applies a side-effectful operation
 *     whenever a dependency signal changes.
 */

import { Consumer } from './graph.js';
import { MacrotaskScheduler } from './schedulers/macrotask-scheduler.js';
import { CancelAction, Scheduler } from './schedulers/scheduler.js';

const defaultScheduler = MacrotaskScheduler.from();

/**
 * Creates an effect, which schedules a side-effectful callback whenever a
 * signal dependency of the callback is invoked.
 *
 * @param callback The callback function to schedule which applies the desired
 *     side effect.
 * @param scheduler The {@link Scheduler} to use when scheduling `callback`
 *     execution.
 * @returns An {@link EffectDisposer} which will dispose the effect and cancel
 *     any scheduled operations.
 */
export function effect(
  callback: () => void,
  scheduler: Scheduler = defaultScheduler,
): EffectDisposer {
  const consumer = Consumer.from();
  const cancelInitialCall = scheduler.schedule(() => {
    consumer.record(callback);
  });

  let cancelNextCall: CancelAction | undefined;
  let scheduled = false;
  consumer.listen(() => {
    // If already scheduled, nothing to do.
    // It might look like we could drop `scheduled` and use the presence of
    // `cancelNextCall` to know whether an event is scheduled, but this would
    // not work for a synchronous `Scheduler`.
    if (scheduled) return;

    scheduled = true;
    cancelNextCall = scheduler.schedule(() => {
      scheduled = false;
      consumer.record(callback);
    });
  });

  return () => {
    cancelInitialCall();
    if (scheduled) cancelNextCall!();
    consumer.destroy();
  };
}

/** Stops and disposes the associated effect. */
export type EffectDisposer = () => void;
