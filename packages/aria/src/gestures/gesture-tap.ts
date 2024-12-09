import { filter, map, Observable } from "rxjs"

import { Gesture, GestureCaptureState, GestureOptions } from "./gesture"
import { GestureEvent, GesturePhase, GesturePointerType } from "./gesture-event"

export type GestureTapEvent = GestureEvent<"gesture-tap">
export type GestureTapOptions = GestureOptions<GestureTapImpl>

export class GestureTapImpl extends Gesture<GestureTapEvent> {
    constructor(options?: GestureTapOptions) {
        super(
            "gesture-tap",
            ["touchstart", "touchmove", "touchend", "touchcancel", "mousedown", "mousemove", "mouseup"],
            {
                filterPointerTypes: [GesturePointerType.Mouse, GesturePointerType.Touch],
                ...options
            }
        )
    }

    // TODO
    override capture(events: Observable<GestureEvent>): Observable<GestureCaptureState> {
        return events.pipe(
            map(event => {
                if (event.pointers.length !== 1) {
                    return GestureCaptureState.Skip
                }

                const distance = event.pointers[0].distance
                if (Math.abs(distance.x) < this.distanceInclusion && Math.abs(distance.y) < this.distanceInclusion) {
                    return event.phase === GesturePhase.End ? GestureCaptureState.Instant : GestureCaptureState.Pending
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

export function gestureTap(options?: GestureTapOptions) {
    return new GestureTapImpl(options)
}

export const GestureTap = gestureTap()
