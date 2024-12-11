import { map, Observable, tap } from "rxjs"

import { Mutable } from "utility-types"

import { Position } from "@ngutil/style"

import { Gesture, GestureCaptureState, GestureOptions } from "./gesture"
import { GestureDetail } from "./gesture-event"

export interface GestureDragDetail extends GestureDetail {
    moveBy: Position
}

export type GestureDragOptions = GestureOptions<GestureDragImpl>

export class GestureDragImpl<T extends GestureDragDetail = GestureDragDetail> extends Gesture<T> {
    readonly type = "gesture-drag"
    readonly horizontal?: boolean
    readonly vertical?: boolean

    constructor(options?: GestureDragOptions) {
        super({ includeScrollDistance: true, ...options })

        if (this.horizontal == null && this.vertical == null) {
            this.horizontal = true
            this.vertical = true
        }
    }

    override capture(events: Observable<GestureDetail>): Observable<GestureCaptureState> {
        return events.pipe(
            map(state => {
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

    override handle(events: Observable<GestureDetail>) {
        const updater =
            this.horizontal && this.vertical
                ? updateAnyDirection
                : this.horizontal
                  ? updateHorizontalOnly
                  : updateVerticalOnly

        return super.handle(events).pipe(tap(updater<T>))
    }
}

type UpdaterFn = (event: Mutable<GestureDragDetail>) => void

function updateVerticalOnly<T extends GestureDragDetail>(event: Mutable<T>) {
    const pointer = event.pointers[0]
    pointer.distance.x = 0
    pointer.direction.x = 0
    pointer.current.x = pointer.start.x
    updateEvent(event, updateByScrollDistanceVertical)
}

function updateHorizontalOnly<T extends GestureDragDetail>(event: Mutable<T>) {
    const pointer = event.pointers[0]
    pointer.distance.y = 0
    pointer.direction.y = 0
    pointer.current.y = pointer.start.y
    updateEvent(event, updateByScrollDistanceHorizontal)
}

function updateAnyDirection<T extends GestureDragDetail>(event: Mutable<T>) {
    updateEvent(event, updateByScrollDistanceBoth)
}

function updateEvent<T extends GestureDragDetail>(event: Mutable<T>, scrollUpdate: UpdaterFn) {
    event.moveBy = { ...event.pointers[0].distance }
    scrollUpdate(event)
}

function updateByScrollDistanceVertical<T extends GestureDragDetail>(event: Mutable<T>) {
    const sd = event.scrollDistance
    if (sd == null) {
        return
    }
    event.moveBy.y += sd.y
}

function updateByScrollDistanceHorizontal<T extends GestureDragDetail>(event: Mutable<T>) {
    const sd = event.scrollDistance
    if (sd == null) {
        return
    }
    event.moveBy.x += sd.x
}

function updateByScrollDistanceBoth<T extends GestureDragDetail>(event: Mutable<T>) {
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

export const GestureDrag = gestureDrag()
export const GestureDragHorizontal = gestureDrag({ horizontal: true, vertical: false })
export const GestureDragVertical = gestureDrag({ horizontal: false, vertical: true })
