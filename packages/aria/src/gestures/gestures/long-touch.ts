import { Observable } from "rxjs"

import { Gesture, GestureEvent } from "./_base"

export interface LongTouchEventData {}

export type LongTouchEvent = GestureEvent<"nu-longtouch">

export const LongTouch: Gesture<LongTouchEvent> = {
    name: "longtouch",
    priority: 100,
    listeners: ["touchstart", "touchmove", "touchend"],
    handler: events => new Observable(() => {})
}
