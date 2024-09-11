import { filter, map } from "rxjs"

import { Gesture, GestureEvent, GesturePhase, stateToEvent } from "./_base"

export type DraggingEvent = GestureEvent<"nu-dragstart" | "nu-dragend" | "nu-dragmove">

const TypeMap = {
    [GesturePhase.Start]: "nu-dragstart",
    [GesturePhase.Moving]: "nu-dragmove",
    [GesturePhase.End]: "nu-dragend"
}

export const Dragging: Gesture<DraggingEvent> = {
    name: "dragging",
    listeners: ["mousedown", "mousemove", "mouseup", "touchstart", "touchmove", "touchend"],
    priority: 0,
    handler: events => {
        const x = 0
        return events.pipe(
            filter(state => !state.pending || state.pending.length === 0),
            map(state => stateToEvent(state, TypeMap[state.phase!]))
        )
    }
}
