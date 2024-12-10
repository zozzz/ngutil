import { filter, Observable, of } from "rxjs"

import { Gesture, GestureCaptureState, GestureOptions } from "./gesture"
import { GestureDetail, GesturePhase } from "./gesture-event"

export type ContextMenuEvent = GestureDetail
export type ContextMenuOptions = GestureOptions<ContextMenuGesture>

export class ContextMenuGesture extends Gesture<ContextMenuEvent> {
    readonly type = "gesture-contextmenu"
    constructor(options?: ContextMenuOptions) {
        super({ ...options, mouseButtons: [2] })
    }

    override capture(events: Observable<GestureDetail>): Observable<GestureCaptureState> {
        return of(GestureCaptureState.Maybe)
    }

    override handle(events: Observable<GestureDetail>): Observable<ContextMenuEvent> {
        return super.handle(events.pipe(filter(event => event.phase === GesturePhase.End)))
    }
}

export const ContextMenu = new ContextMenuGesture()
