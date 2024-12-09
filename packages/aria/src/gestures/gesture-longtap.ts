import { combineLatest, filter, map, Observable, startWith, timer } from "rxjs"

import { Gesture, GestureCaptureState, GestureOptions } from "./gesture"
import { GestureEvent, GesturePhase, GesturePointerType } from "./gesture-event"

export type GestureLongtapEvent = GestureEvent<"gesture-longtap">
export type GestureLongtapOptions = GestureOptions<GestureLongTapImpl>

export class GestureLongTapImpl extends Gesture<GestureLongtapEvent> {
    constructor(options?: GestureLongtapOptions) {
        super("gesture-longtap", ["touchstart", "touchmove", "touchend", "touchcancel"], {
            filterPointerTypes: [GesturePointerType.Touch],
            ...options
        })
    }

    override capture(events: Observable<GestureEvent>): Observable<GestureCaptureState> {
        return combineLatest({ timeWithin: timer(this.timeWithin).pipe(startWith(null)), event: events }).pipe(
            map(({ timeWithin, event }) => {
                if (event.pointers.length !== 1 || event.elapsed > this.timeWithin) {
                    return GestureCaptureState.Skip
                }

                if (event.phase === GesturePhase.End && event.elapsed > this.timeWithin) {
                    return GestureCaptureState.Skip
                }

                const distance = event.pointers[0].distance

                if (Math.abs(distance.x) < this.distanceInclusion && Math.abs(distance.y) < this.distanceInclusion) {
                    // maybe is ok event.phase === GesturePhase.End
                    return timeWithin !== null ? GestureCaptureState.Instant : GestureCaptureState.Pending
                } else {
                    return GestureCaptureState.Skip
                }
            })
        )
    }

    override handle(events: Observable<GestureEvent>) {
        return super.handle(
            events.pipe(filter(event => event.phase === GesturePhase.Start || event.phase === GesturePhase.End))
        )
    }
}

export function gestureLongTap(options?: GestureLongtapOptions) {
    return new GestureLongTapImpl(options)
}

export const GestureLongTap = gestureLongTap()
