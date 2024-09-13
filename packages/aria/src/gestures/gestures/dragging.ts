import { filter, map } from "rxjs"

import { Gesture, GestureEvent, GesturePhase, stateToEvent } from "./_base"

// export type DraggingEvent = GestureEvent<"dragging-start" | "dragging-end" | "dragging-move">

export interface DraggingEvent extends GestureEvent<"dragging-start" | "dragging-end" | "dragging-move"> {}

const TypeMap = {
    [GesturePhase.Start]: "dragging-start",
    [GesturePhase.Moving]: "dragging-move",
    [GesturePhase.End]: "dragging-end"
}

export const Dragging: Gesture<DraggingEvent> = {
    name: "dragging",
    listeners: ["mousedown", "mousemove", "mouseup", "touchstart", "touchmove", "touchend"],
    priority: 0,
    handler: events =>
        events.pipe(
            filter(state => !state.pending || state.pending.length === 0),
            map(state => stateToEvent(state, TypeMap[state.phase!]))
        )
}
