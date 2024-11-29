import { DOCUMENT } from "@angular/common"
import { inject, Injectable, NgZone } from "@angular/core"

import {
    concatMap,
    filter,
    finalize,
    fromEvent,
    map,
    merge,
    Observable,
    of,
    scan,
    share,
    startWith,
    takeWhile,
    tap
} from "rxjs"

import { flatten } from "lodash-es"
import { Mutable } from "utility-types"

import { coerceElement, ElementInput } from "@ngutil/common"
import { Position } from "@ngutil/style"

import {
    Gesture,
    GestureEvent,
    GestureMatchState,
    GestureOrigin,
    GesturePhase,
    GesturePointerType,
    Listeners
} from "./gestures"

@Injectable({ providedIn: "root" })
export class GesturesService {
    readonly #document = inject(DOCUMENT)
    readonly #zone = inject(NgZone)
    readonly #listeners = new Map<HTMLElement | Document, Map<string, Observable<GestureMatchState>>>()

    watch<T extends GestureEvent>(el: ElementInput, ...gestures: Gesture<T>[]): Observable<T> {
        return this.#zone.runOutsideAngular(() => {
            const listeners = flatten(gestures.map(v => v.listeners || []))
            const { trigger, watch } = this.#getListeners(coerceElement(el), listeners)

            let pointerType: GesturePointerType | undefined
            return trigger.pipe(
                filter(state => {
                    if (pointerType == null) {
                        pointerType = state.pointerType
                    }
                    return pointerType === state.pointerType
                }),
                concatMap(v =>
                    this.#zone.runOutsideAngular(() => {
                        const watching = watch[pointerType!].pipe(
                            startWith(v),
                            scan(
                                (state, curr) => updatePointers<T>({ ...state, ...curr } as T),
                                {} as GestureMatchState<T>
                            ),
                            takeWhile(state => state.phase !== GesturePhase.End, true),
                            share()
                        )
                        return merge(...gestures.map(v => v.handler(watching)))
                    })
                )
            )
        })
    }

    #getListeners<T extends GestureEvent>(inputEl: HTMLElement, listeners: string[]) {
        const triggers: string[] = []
        const watches: { [key: string]: string[] } = {}

        for (const name of listeners) {
            const conf = Listeners[name]

            const container =
                conf.phase === GesturePhase.Start
                    ? triggers
                    : (watches[conf.pointerType] = watches[conf.pointerType] || [])

            if (container.indexOf(name) === -1) {
                container.push(name)
            }
        }

        if (triggers.length === 0) {
            throw Error("Missing start events")
        }

        const observable = (names: string[]) => {
            if (names.length === 0) {
                return of()
            } else if (names.length === 1) {
                return this.#getListener<T>(inputEl, names[0])
            } else {
                return merge(...names.map(v => this.#getListener<T>(inputEl, v)))
            }
        }

        return {
            trigger: observable(triggers),
            watch: {
                [GesturePointerType.Mouse]: observable(watches[GesturePointerType.Mouse]),
                [GesturePointerType.Touch]: observable(watches[GesturePointerType.Touch])
            }
        }
    }

    #getListener<T extends GestureEvent>(inputEl: HTMLElement, name: string): Observable<GestureMatchState<T>> {
        return this.#zone.runOutsideAngular(() => {
            const target = Listeners[name].target
            const targetObj = target === "document" ? this.#document : inputEl
            let targetListeners = this.#listeners.get(targetObj)

            if (targetListeners == null) {
                targetListeners = new Map()
                this.#listeners.set(targetObj, targetListeners)
            }

            let listener = targetListeners.get(name)
            if (listener == null) {
                const { phase, pointerType, options } = Listeners[name]
                const passive = options?.passive

                listener = fromEvent<GestureOrigin>(targetObj, name, options as any).pipe(
                    finalize(() => {
                        targetListeners.delete(name)
                    }),
                    map(
                        origin =>
                            ({
                                origin,
                                phase,
                                pointerType,
                                preventDefault: passive === false ? origin.preventDefault.bind(origin) : noop
                            }) as unknown as GestureMatchState<T>
                    )
                )

                if (phase === GesturePhase.Start) {
                    listener = listener.pipe(
                        tap(state => {
                            ;(state as Mutable<GestureMatchState>).target = state.origin.target as HTMLElement
                        })
                    )
                }

                listener = listener.pipe(share())

                targetListeners.set(name, listener)
            }

            return listener as Observable<GestureMatchState<T>>
        })
    }
}

function pointersFromEvent(event: MouseEvent | TouchEvent): Position[] {
    if (event instanceof MouseEvent) {
        return [
            {
                x: event.clientX,
                y: event.clientY
            }
        ]
    } else {
        return Array.from(event.touches).map(t => {
            return { x: t.clientX, y: t.clientY }
        })
    }
}

function updatePointers<T extends GestureEvent>(state: Mutable<T>): GestureMatchState<T> {
    if (state.phase === GesturePhase.Start) {
        state.pointers = pointersFromEvent(state.origin).map(v => {
            return { start: v, current: v, distance: { x: 0, y: 0 }, direction: { x: 0, y: 0 } }
        })
    } else if (state.pointers) {
        const pointers = pointersFromEvent(state.origin)
        if (pointers.length === 0) {
            return state
        }

        state.pointers = state.pointers.map((v, i) => {
            const p = pointers[i]
            return {
                start: v.start,
                current: p,
                distance: { x: p.x - v.start.x, y: p.y - v.start.y },
                direction: { x: direction(v.start.x, p.x), y: direction(v.start.y, p.y) }
            }
        })
    }

    return state
}

function direction(prev: number, curr: number): -1 | 0 | 1 {
    return curr > prev ? 1 : curr < prev ? -1 : 0
}

// const svc = new GesturesService()
// const w = svc.watch(document.createElement("div"), DragAndDrop)
function noop() {}
