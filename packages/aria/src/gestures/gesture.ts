import { Observable } from "rxjs"

import { FunctionKeys, Mutable } from "utility-types"

import { GestureDetail, GesturePointerType, Listeners } from "./gesture-event"

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

type _GestureOptions = Partial<Omit<Gesture<any>, "originTypes" | "name" | FunctionKeys<Gesture<any>>>>
export type GestureOptions<T extends object> = Partial<Omit<T, keyof Gesture<any> | FunctionKeys<T>>> & _GestureOptions

export abstract class Gesture<T extends GestureDetail = GestureDetail> {
    /**
     * Gestures that depends on move distance, like drag, use this option
     */
    readonly distanceInclusion = 10

    /**
     * Gestures thet dependnso on time frame, like longtap, use this option
     */
    readonly timeWithin = 300

    /**
     * The priority of the gesture
     */
    readonly priority = 0

    /**
     * Should the gesture include the scroll distance
     */
    readonly includeScrollDistance: boolean = false

    /**
     * The pointer types of the gesture
     */
    readonly pointerTypes: Array<GesturePointerType> = [GesturePointerType.Mouse, GesturePointerType.Touch]

    /**
     * The number of pointers of the gesture can handle
     */
    readonly pointerCount: number = 1

    /**
     * The mouse buttons of the gesture (1 = left, 2 = middle, 3 = right)
     */
    readonly mouseButtons: Array<number> = [0]

    /**
     * The event types of the gesture can handle
     */
    readonly originTypes: Array<string>

    constructor(
        public readonly name: string,
        options: _GestureOptions = {}
    ) {
        Object.assign(this, options)
        this.originTypes = Object.keys(Listeners).filter(v => this.pointerTypes.includes(Listeners[v].pointerType))
    }

    /**
     * Test if the gesture should be captured.
     * The given events is filterde by {@see Gesture#shouldCapture}
     * ! important, dont rely on this object state, because not always create a new object
     * @param events events to check
     */
    abstract capture(events: Observable<GestureDetail>): Observable<GestureCaptureState>

    /**
     * Transform input event, to gesture event.
     * The given events is filterde by {@see Gesture#isRelevantEvent}
     * ! important, dont rely on this object state, because not always create a new object
     * @param events events to transform or filter or leave as is
     */
    handle(events: Observable<GestureDetail>): Observable<Mutable<T>> {
        return events as Observable<Mutable<T>>
    }

    /**
     * Should this gesture capture the event?
     * @param event event to check
     * @returns true if the gesture should capture the event, false otherwise
     */
    shouldCapture(event: GestureDetail): boolean {
        return this.isRelevantEvent(event)
    }

    /**
     * Test if the event is relevant to the gesture.
     * The event is relevant if
     * @param event event to check
     * @returns true if the event is relevant, false otherwise
     */
    isRelevantEvent(event: GestureDetail): boolean {
        return (
            this.pointerTypes.includes(event.pointerType) &&
            this.pointerCount === event.pointers.length &&
            this.originTypes.includes(event.origin.type as any) &&
            (event.pointerType !== GesturePointerType.Mouse ||
                (event.origin instanceof MouseEvent && this.mouseButtons.includes(event.origin.button)))
        )
    }
}
