import { Position } from "@ngutil/style"

export interface GestureDetail {
    readonly origin: GestureOrigin
    readonly target: HTMLElement
    readonly pointerType: GesturePointerType
    readonly phase: GesturePhase
    readonly pointers: ReadonlyArray<GesturePointer>
    readonly timeStamp: number
    readonly elapsed: number
    readonly scrollDistance?: Position
}

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

export interface GestureListenerConfig {
    options?: AddEventListenerOptions
    pointerType: GesturePointerType
    phase: GesturePhase
}

export const Listeners: { [key: string]: GestureListenerConfig } = {
    mousedown: {
        pointerType: GesturePointerType.Mouse,
        phase: GesturePhase.Start,
        options: { capture: true, passive: false }
    },
    mousemove: {
        pointerType: GesturePointerType.Mouse,
        phase: GesturePhase.Moving,
        options: { capture: true, passive: false }
    },
    mouseup: {
        pointerType: GesturePointerType.Mouse,
        phase: GesturePhase.End,
        options: { capture: true, passive: false }
    },
    touchstart: {
        pointerType: GesturePointerType.Touch,
        phase: GesturePhase.Start,
        options: { capture: true, passive: false }
    },
    touchmove: {
        pointerType: GesturePointerType.Touch,
        phase: GesturePhase.Moving,
        options: { capture: true, passive: false }
    },
    touchend: {
        pointerType: GesturePointerType.Touch,
        phase: GesturePhase.End,
        options: { capture: true, passive: false }
    },
    touchcancel: {
        pointerType: GesturePointerType.Touch,
        phase: GesturePhase.End,
        options: { capture: true, passive: false }
    }
    // ,
    // contextmenu: {
    //     pointerType: GesturePointerType.Mouse,
    //     phase: GesturePhase.Start,
    //     options: { capture: true, passive: false }
    // }
} as const
