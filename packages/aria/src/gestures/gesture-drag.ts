import { map, Observable, tap } from "rxjs"

import { Mutable } from "utility-types"

import { Position } from "@ngutil/style"

import { Gesture, GestureCaptureState, GestureOptions } from "./gesture"
import { GestureEvent } from "./gesture-event"

export interface GestureDragEvent extends GestureEvent<"gesture-drag"> {
    moveBy: Position
}

export type GestureDragOptions = GestureOptions<GestureDragImpl>

const DRAG_LISTENERS: Gesture<any>["filterListeners"] = [
    "mousedown",
    "mousemove",
    "mouseup",
    "touchstart",
    "touchmove",
    "touchend",
    "touchcancel"
]

export class GestureDragImpl extends Gesture<GestureDragEvent> {
    readonly horizontal?: boolean
    readonly vertical?: boolean

    constructor(options?: GestureDragOptions) {
        super("gesture-drag", DRAG_LISTENERS, { includeScrollDistance: true, ...options })

        if (this.horizontal == null && this.vertical == null) {
            this.horizontal = true
            this.vertical = true
        }
    }

    override capture(events: Observable<GestureEvent>): Observable<GestureCaptureState> {
        return events.pipe(
            map(state => {
                if (state.pointers.length !== 1) {
                    return GestureCaptureState.Skip
                }

                if (Math.abs(state.pointers[0].distance.x) > this.distanceInclusion) {
                    return this.horizontal ? GestureCaptureState.Maybe : GestureCaptureState.Skip
                }

                if (Math.abs(state.pointers[0].distance.y) > this.distanceInclusion) {
                    return this.vertical ? GestureCaptureState.Maybe : GestureCaptureState.Skip
                }
                return GestureCaptureState.Pending
            })
        )
    }

    override handle(events: Observable<GestureEvent>) {
        const updater =
            this.horizontal && this.vertical
                ? updateAnyDirection
                : this.horizontal
                  ? updateHorizontalOnly
                  : updateVerticalOnly

        return super.handle(events).pipe(tap(updater))
    }
}

type UpdaterFn = (event: Mutable<GestureDragEvent>) => void

function updateVerticalOnly(event: Mutable<GestureDragEvent>) {
    const pointer = event.pointers[0]
    pointer.distance.x = 0
    pointer.direction.x = 0
    pointer.current.x = pointer.start.x
    updateEvent(event, updateByScrollDistanceVertical)
}

function updateHorizontalOnly(event: Mutable<GestureDragEvent>) {
    console.log("updateHorizontalOnly")
    const pointer = event.pointers[0]
    pointer.distance.y = 0
    pointer.direction.y = 0
    pointer.current.y = pointer.start.y
    updateEvent(event, updateByScrollDistanceHorizontal)
}

function updateAnyDirection(event: Mutable<GestureDragEvent>) {
    updateEvent(event, updateByScrollDistanceBoth)
}

function updateEvent(event: Mutable<GestureDragEvent>, scrollUpdate: UpdaterFn) {
    event.moveBy = { ...event.pointers[0].distance }
    scrollUpdate(event)
}

function updateByScrollDistanceVertical(event: Mutable<GestureDragEvent>) {
    const sd = event.scrollDistance
    if (sd == null) {
        return
    }
    event.moveBy.y += sd.y
}

function updateByScrollDistanceHorizontal(event: Mutable<GestureDragEvent>) {
    const sd = event.scrollDistance
    if (sd == null) {
        return
    }
    event.moveBy.x += sd.x
}

function updateByScrollDistanceBoth(event: Mutable<GestureDragEvent>) {
    const sd = event.scrollDistance
    if (sd == null) {
        return
    }
    event.moveBy.x += sd.x
    event.moveBy.y += sd.y
}

export function gestureDrag(options?: GestureDragOptions) {
    return new GestureDragImpl(options)
}

export const GestureDarg = gestureDrag()
export const GestureDargHorizontal = gestureDrag({ horizontal: true, vertical: false })
export const GestureDargVertical = gestureDrag({ horizontal: false, vertical: true })
