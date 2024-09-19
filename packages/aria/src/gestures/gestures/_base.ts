import { Observable } from "rxjs"

import { Mutable } from "utility-types"

import { Position } from "@ngutil/style"

export interface Gesture<T extends GestureEvent> {
    name: string
    priority: number
    listeners?: Array<keyof DocumentEventMap>
    handler: GestureHandler<T>
}

export type GestureHandler<T extends GestureEvent> = (events: Observable<GestureMatchState<T>>) => Observable<T>

export type GestureListener = {
    name: keyof DocumentEventMap
    target: ListenerTarget
    // options?: AddEventListenerOptions
}

export interface GestureEvent<T extends string = string> {
    readonly type: T
    readonly origin: GestureOrigin
    readonly target: HTMLElement
    readonly pointerType: GesturePointerType
    readonly phase: GesturePhase
    readonly pointers: ReadonlyArray<GesturePointer>

    preventDefault(): void
}

type GestureEventFixFields = "target" | "origin" | "pointers" | "phase" | "pointerType" | "preventDefault"

export type PointersPosition = ReadonlyArray<Readonly<Position>>

export interface GesturePointer {
    readonly start: Position
    readonly current: Position
    readonly end?: Position
    readonly distance: Position
    readonly direction: { x: -1 | 0 | 1; y: -1 | 0 | 1 }
}

export type GestureOrigin = MouseEvent | TouchEvent

export const enum GesturePointerType {
    Mouse = "mouse",
    Touch = "touch"
}

export const enum GesturePhase {
    Start = "start",
    Moving = "moving",
    End = "end"
}

export type GestureMatchState<T extends GestureEvent = GestureEvent> = Partial<
    Mutable<Omit<T, GestureEventFixFields>>
> &
    Pick<T, GestureEventFixFields> & {
        readonly pending?: Array<string>
    }

export function stateToEvent<T extends GestureEvent>(state: GestureMatchState, type: string): T {
    return {
        type: type,
        origin: state.origin!,
        target: state.target!,
        pointerType: state.pointerType!,
        phase: state.phase!,
        pointers: state.pointers!
    } as T
}

export interface ListenerConfig {
    target: ListenerTarget
    options?: AddEventListenerOptions
    pointerType: GesturePointerType
    phase: GesturePhase
}

export const enum ListenerTarget {
    Document = "document",
    Element = "element"
}

export const Listeners: { [key: string]: ListenerConfig } = {
    mousedown: {
        target: ListenerTarget.Element,
        pointerType: GesturePointerType.Mouse,
        phase: GesturePhase.Start,
        options: { capture: true, passive: false }
    },
    mousemove: {
        target: ListenerTarget.Document,
        pointerType: GesturePointerType.Mouse,
        phase: GesturePhase.Moving,
        options: { capture: true, passive: false }
    },
    mouseup: {
        target: ListenerTarget.Document,
        pointerType: GesturePointerType.Mouse,
        phase: GesturePhase.End,
        options: { capture: true, passive: true }
    },
    touchstart: {
        target: ListenerTarget.Element,
        pointerType: GesturePointerType.Touch,
        phase: GesturePhase.Start,
        options: { capture: true, passive: false }
    },
    touchmove: {
        target: ListenerTarget.Document,
        pointerType: GesturePointerType.Touch,
        phase: GesturePhase.Moving,
        options: { capture: true, passive: false }
    },
    touchend: {
        target: ListenerTarget.Document,
        pointerType: GesturePointerType.Touch,
        phase: GesturePhase.End,
        options: { capture: true, passive: false }
    },
    touchcancel: {
        target: ListenerTarget.Document,
        pointerType: GesturePointerType.Touch,
        phase: GesturePhase.End,
        options: { capture: true, passive: true }
    }
} as const
