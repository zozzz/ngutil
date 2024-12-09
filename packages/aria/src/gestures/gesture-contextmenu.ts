import { filter, Observable, of } from "rxjs"

import { Gesture, GestureCaptureState, GestureOptions } from "./gesture"
import { GestureEvent, GesturePhase } from "./gesture-event"

export type ContextMenuEvent = GestureEvent<"contextmenu">
export type ContextMenuOptions = GestureOptions<ContextMenuGesture>

export class ContextMenuGesture extends Gesture<ContextMenuEvent> {
    constructor(options?: ContextMenuOptions) {
        super("contextmenu", ["touchstart", "touchend", "mousedown", "mouseup"], {
            ...options,
            filterMouseButtons: [2]
        })
    }

    override capture(events: Observable<GestureEvent>): Observable<GestureCaptureState> {
        return of(GestureCaptureState.Maybe)
    }

    override handle(events: Observable<GestureEvent>): Observable<ContextMenuEvent> {
        return super.handle(events.pipe(filter(event => event.phase === GesturePhase.End)))
    }
}

export const ContextMenu = new ContextMenuGesture()
