import { combineLatest, filter, map, Observable, startWith, timer } from "rxjs"

import { Gesture, GestureCaptureState, GestureOptions } from "./gesture"
import { GestureDetail, GesturePhase, GesturePointerType } from "./gesture-event"

export type GestureLongTapDetail = GestureDetail<"gesture-longtap">
export type GestureLongTapOptions = GestureOptions<GestureLongTapImpl>

export class GestureLongTapImpl<T extends GestureLongTapDetail = GestureLongTapDetail> extends Gesture<T> {
    constructor(options?: GestureLongTapOptions) {
        super("gesture-longtap", { pointerTypes: [GesturePointerType.Touch], ...options })
    }

    override capture(events: Observable<GestureDetail>): Observable<GestureCaptureState> {
        return combineLatest({ timeWithin: timer(this.timeWithin).pipe(startWith(null)), event: events }).pipe(
            map(({ timeWithin, event }) => {
                if (event.elapsed > this.timeWithin) {
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

    override handle(events: Observable<GestureDetail>) {
        return super.handle(
            events.pipe(filter(event => event.phase === GesturePhase.Start || event.phase === GesturePhase.End))
        )
    }
}

export function gestureLongTap(options?: GestureLongTapOptions) {
    return new GestureLongTapImpl(options)
}

export const GestureLongTap = gestureLongTap()
