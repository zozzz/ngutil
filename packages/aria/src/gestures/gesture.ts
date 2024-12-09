import { Observable, tap } from "rxjs"

import { FunctionKeys, Mutable } from "utility-types"

import { GestureEvent, GesturePointerType, Listeners } from "./gesture-event"

export const enum GestureCaptureState {
    // Unchecked
    Unchecked = 0,
    // Pending state
    Pending = 1,
    // Skip capture
    Skip = 2,
    // Determine by priority
    Maybe = 3,
    // Instanlty terminate capture, and fire event
    Instant = 4
}

type _GestureOptions = Partial<Omit<Gesture<any>, "filterListeners" | "name" | FunctionKeys<Gesture<any>>>>
export type GestureOptions<T extends object> = Partial<Omit<T, keyof Gesture<any> | FunctionKeys<T>>> & _GestureOptions

export abstract class Gesture<T extends GestureEvent = GestureEvent> {
    // TODO maybe global option
    readonly distanceInclusion = 10
    // TODO maybe global option
    readonly timeWithin = 300
    readonly priority = 0
    readonly includeScrollDistance: boolean = false
    readonly filterPointerTypes: Array<GesturePointerType> = [GesturePointerType.Mouse, GesturePointerType.Touch]
    readonly filterMouseButtons: Array<number> = [0]
    readonly filterListeners: Array<keyof DocumentEventMap>

    constructor(
        public readonly name: string,
        listeners: Array<keyof DocumentEventMap>,
        options: _GestureOptions = {}
    ) {
        Object.assign(this, options)
        this.filterListeners = listeners.filter(v => this.filterPointerTypes.includes(Listeners[v].pointerType))
    }

    /**
     * Test if the gesture should be captured.
     * ! important, dont rely on this object state, because not always create a new object
     */
    abstract capture(events: Observable<GestureEvent>): Observable<GestureCaptureState>

    /**
     * Transform input event, to gesture event
     * ! important, dont rely on this object state, because not always create a new object
     */
    handle(events: Observable<GestureEvent>): Observable<Mutable<T>> {
        return (events as Observable<Mutable<T>>).pipe(tap(event => (event.type = this.name)))
    }

    filterByEvent = <T extends GestureEvent>(event: T): event is T =>
        this.filterPointerTypes.includes(event.pointerType) &&
        // this.filterListeners.includes(event.origin.type as any) &&
        (event.pointerType !== GesturePointerType.Mouse ||
            (event.origin instanceof MouseEvent && this.filterMouseButtons.includes(event.origin.button)))
}
