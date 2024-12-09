import { filter, map, Observable } from "rxjs"

import { Gesture, GestureCaptureState, GestureOptions } from "./gesture"
import { GestureDetail, GesturePhase } from "./gesture-event"

export type GestureTapDetail = GestureDetail<"gesture-tap">
export type GestureTapOptions = GestureOptions<GestureTapImpl>

export class GestureTapImpl<T extends GestureTapDetail = GestureTapDetail> extends Gesture<T> {
    constructor(options?: GestureTapOptions) {
        super("gesture-tap", options)
    }

    override capture(events: Observable<GestureDetail>): Observable<GestureCaptureState> {
        return events.pipe(
            map(event => {
                const distance = event.pointers[0].distance
                if (Math.abs(distance.x) < this.distanceInclusion && Math.abs(distance.y) < this.distanceInclusion) {
                    // TODO
                    // if (event.phase === GesturePhase.End) {
                    //     if (event.target === event.origin.target || event.target.contains(event.origin.target)) {
                    //         return GestureCaptureState.Instant
                    //     } else {
                    //         return GestureCaptureState.Skip
                    //     }
                    // } else {
                    //     return GestureCaptureState.Pending
                    // }
                    return event.phase === GesturePhase.End ? GestureCaptureState.Instant : GestureCaptureState.Pending
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

export function gestureTap(options?: GestureTapOptions) {
    return new GestureTapImpl(options)
}

export const GestureTap = gestureTap()
