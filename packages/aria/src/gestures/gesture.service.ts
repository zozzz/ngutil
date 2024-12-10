import { DOCUMENT } from "@angular/common"
import { inject, Injectable, NgZone } from "@angular/core"
import { takeUntilDestroyed } from "@angular/core/rxjs-interop"

import {
    combineLatest,
    connect,
    debounceTime,
    filter,
    finalize,
    map,
    merge,
    Observable,
    scan,
    share,
    startWith,
    Subject,
    Subscriber,
    switchMap,
    takeWhile,
    tap
} from "rxjs"

import { Mutable } from "utility-types"

import { __zone_symbol__, coerceElement, ElementInput, isFalsy, isTruthy } from "@ngutil/common"
import { Position } from "@ngutil/style"

import { Gesture, GestureCaptureState, GestureEvent } from "./gesture"
import {
    GestureDetail,
    GestureListenerConfig,
    GestureOrigin,
    GesturePhase,
    GesturePointerType,
    Listeners
} from "./gesture-event"

const ADD_EVENT_LISTENER = __zone_symbol__("addEventListener")
const REMOVE_EVENT_LISTENER = __zone_symbol__("removeEventListener")
const DISPATCH_EVENT = __zone_symbol__("dispatchEvent")

type GesturesToEventsType<T extends Array<Gesture>> =
    T extends Array<infer G> ? (G extends Gesture ? GestureEvent<G> : never) : never

type GestureEventDiscriminator<T> = T extends { type: infer N } ? { type: N } & T : never

export type GestureWatchReturns<T extends Array<Gesture>> = Observable<
    GestureEventDiscriminator<GesturesToEventsType<T>>
>

export type GestureListenReturns<T extends Array<Gesture>> = Observable<GesturesToEventsType<T>>

interface BeginState {
    detail: GestureDetail
    gestures: Map<Gesture, GestureCaptureState>
    includeScrollDistance: boolean
}

interface CaptureState {
    events: GestureDetail[]
    gestures: BeginState["gestures"]
    includeScrollDistance: BeginState["includeScrollDistance"]
}

interface CaptureSelectState {
    events: GestureDetail[]
    gesture?: Gesture
    watchers?: Array<Watcher>
}

interface Watcher {
    readonly el: HTMLElement
    readonly gesture: Gesture
}

const SCROLL_LISTENER_OPTIONS: AddEventListenerOptions = { passive: true }

@Injectable({ providedIn: "root" })
export class GestureService {
    readonly #zone = inject(NgZone)
    readonly #document = inject(DOCUMENT)

    #watchers: Watcher[] = []
    readonly #trigger = new Subject<GestureDetail>()

    readonly #moving: Observable<GestureDetail> = merge(
        ...Object.keys(Listeners)
            .filter(name => Listeners[name].phase === GesturePhase.Moving)
            .map(name => this.#listen(name, Listeners[name]))
    ).pipe(share())

    readonly #end: Observable<GestureDetail> = merge(
        ...Object.keys(Listeners)
            .filter(name => Listeners[name].phase === GesturePhase.End)
            .map(name => this.#listen(name, Listeners[name]))
    ).pipe(share())

    readonly #eventStream = merge(this.#moving, this.#end).pipe(share())

    readonly #begin = new Observable((dst: Subscriber<BeginState>) => {
        let pointerType: GesturePointerType | undefined

        return this.#trigger
            .pipe(
                filter(event => {
                    if (pointerType == null) {
                        pointerType = event.pointerType
                    }

                    return event.pointerType === pointerType
                }),
                connect(events =>
                    merge(
                        events,
                        // reset pointerType on end, after 200ms, because touchend is maybe followed by a mouse event
                        this.#end.pipe(
                            debounceTime(200),
                            tap(() => {
                                pointerType = undefined
                                this.#enableTouchAction()
                            }),
                            filter(() => false)
                        )
                    )
                ),
                // Select active watchers
                map(event => {
                    updatePointers(event)
                    const eventTarget = event.target
                    let includeScrollDistance = false
                    const gestures = this.#watchers
                        .filter(
                            ({ gesture, el }) =>
                                gesture.shouldCapture(event) &&
                                (el === eventTarget || ("contains" in el && el.contains(eventTarget)))
                        )
                        .reduce(
                            (gestures, { gesture }) => {
                                if (!gestures.has(gesture)) {
                                    includeScrollDistance = includeScrollDistance || gesture.includeScrollDistance
                                    gestures.set(gesture, GestureCaptureState.Unchecked)
                                }
                                return gestures
                            },
                            new Map() as BeginState["gestures"]
                        )

                    return { detail: event, gestures, includeScrollDistance } satisfies BeginState
                }),
                filter(({ gestures }) => gestures.size > 0),
                tap(this.#disableTouchAction)
                // finalize(() => console.log("FINALIZE BEGIN"))
            )
            .subscribe(dst)
    })

    readonly #gesture = this.#begin.pipe(
        switchMap(({ detail: startEvent, gestures, includeScrollDistance }) => {
            const pointerType = startEvent.pointerType
            const startAt = startEvent.origin.timeStamp
            const dispatchEvent = startEvent.target[DISPATCH_EVENT].bind(startEvent.target)

            const eventStreamInit = this.#eventStream.pipe(
                startWith(startEvent),
                filter(event => event.pointerType === pointerType)
            )

            const eventStreamSource = !includeScrollDistance
                ? eventStreamInit
                : combineLatest([
                      eventStreamInit,
                      this.#scrollDistance(startEvent.target).pipe(startWith({ x: 0, y: 0 }))
                  ]).pipe(
                      map(([src, distance]) => {
                          ;(src as Mutable<GestureDetail>).scrollDistance = distance
                          return src
                      })
                  )

            const eventStream = eventStreamSource.pipe(
                scan(
                    (state, curr) =>
                        updatePointers({
                            ...state,
                            ...curr,
                            elapsed: curr.origin.timeStamp - startAt!
                        }),
                    startEvent
                ),
                takeWhile(event => event.phase !== GesturePhase.End, true),
                // finalize(() => console.log("FINALIZE WATCH")),
                share()
            )

            const captureState = eventStream.pipe(
                connect(src => {
                    const state: CaptureState = { events: [], gestures, includeScrollDistance }
                    return merge(
                        src.pipe(tap(event => state.events.push(event))),
                        ...Array.from(gestures.keys()).map(gesture =>
                            gesture.capture(src.pipe(filter(gesture.shouldCapture.bind(gesture)))).pipe(
                                takeWhile(result => result !== GestureCaptureState.Skip, true),
                                tap(result => gestures.set(gesture, result))
                            )
                        )
                    ).pipe(map(() => state))
                })
                // ,finalize(() => console.log("FINALIZE CAPTURE"))
            )

            const selectGesture = captureState.pipe(
                map(state => {
                    const partitions: { [k in GestureCaptureState]?: Gesture[] } = {}

                    for (const [gesture, captureState] of state.gestures) {
                        const partition = (partitions[captureState] ??= [])
                        partition.push(gesture)
                    }

                    if (partitions[GestureCaptureState.Instant] != null) {
                        return {
                            gesture: partitions[GestureCaptureState.Instant].sort(sortByPripority)[0],
                            events: state.events
                        } as CaptureSelectState
                    }

                    // while not all gestures return from Gesture.capture
                    if (partitions[GestureCaptureState.Unchecked] != null) {
                        return null
                    }

                    // while has pending, the capture is continued
                    if (partitions[GestureCaptureState.Pending] != null) {
                        return null
                    }

                    // no pendig & has maybe
                    if (partitions[GestureCaptureState.Maybe] != null) {
                        return {
                            gesture: partitions[GestureCaptureState.Maybe].sort(sortByPripority)[0],
                            events: state.events
                        } as CaptureSelectState
                    }

                    // no pending & no maybe & no terminate
                    // so, nothign matched
                    return { events: state.events } as CaptureSelectState
                }),
                takeWhile(isFalsy, true),
                filter(isTruthy),
                takeWhile(v => v!.gesture != null, false)
                // finalize(() => console.log("FINALIZE SELECT"))
            ) as Observable<Required<CaptureSelectState>>

            return selectGesture.pipe(
                switchMap(({ events, gesture }) =>
                    gesture
                        .handle(eventStream.pipe(startWith(...events), filter(gesture.isRelevantEvent.bind(gesture))))
                        .pipe(
                            takeWhile(v => v.phase !== GesturePhase.End, true),
                            tap(detail =>
                                dispatchEvent(
                                    new CustomEvent(gesture.type, { detail, bubbles: true, cancelable: true })
                                )
                            )
                            // finalize(() => console.log("GESTURE FINALIZE")),
                        )
                ),
                // finalize(() => console.log("FINALIZE RESULT")),
                finalize(this.#enableTouchAction)
            )
        }),
        share()
    )

    constructor() {
        const triggers = merge(
            ...Object.keys(Listeners)
                .filter(name => Listeners[name].phase === GesturePhase.Start)
                .map(name => this.#listen(name, Listeners[name]))
        )
        triggers.pipe(takeUntilDestroyed()).subscribe(this.#trigger)
    }

    listen<T extends Array<Gesture>>(el: ElementInput, ...gestures: T): GestureListenReturns<T> {
        return new Observable((dst: Subscriber<GestureDetail>) =>
            this.#zone.runOutsideAngular(() => {
                const element = coerceElement(el)
                const next = dst.next.bind(dst)
                for (const gesture of gestures) {
                    element[ADD_EVENT_LISTENER](gesture.type as any, next)
                    dst.add(element[REMOVE_EVENT_LISTENER].bind(element, gesture.type as any, next as any))
                }
                dst.add(this.#watch(element, ...gestures).subscribe())
            })
        ) as any
    }

    #watch<T extends Array<Gesture>>(el: ElementInput, ...gestures: T): GestureWatchReturns<T> {
        return new Observable((dst: Subscriber<GestureDetail>) =>
            this.#zone.runOutsideAngular(() => {
                const element = coerceElement(el)
                const watchers = gestures.map(gesture => {
                    return { gesture, el: element }
                })
                this.#add(watchers)
                dst.add(this.#gesture.subscribe(dst))
                return () => {
                    this.#remove(watchers)
                }
            })
        ) as any
    }

    #add(watchers: Watcher[]) {
        this.#watchers = this.#watchers.concat(watchers)
    }

    #remove(watchers: Watcher[]) {
        this.#watchers = this.#watchers.filter(v => !watchers.includes(v))
    }

    #listen(name: string, config: GestureListenerConfig) {
        const { phase, pointerType, options } = config

        const toResult =
            phase === GesturePhase.Start
                ? (origin: GestureOrigin) =>
                      ({
                          origin,
                          phase,
                          pointerType,
                          target: origin.target as HTMLElement
                      }) as GestureDetail
                : (origin: GestureOrigin) => {
                      if (origin.cancelable) {
                          origin.preventDefault()
                      }
                      return { origin, phase, pointerType } as GestureDetail
                  }

        return new Observable((dst: Subscriber<GestureDetail>) =>
            this.#zone.runOutsideAngular(() => {
                const listener = (origin: GestureOrigin) => {
                    if (origin.defaultPrevented) {
                        return
                    }
                    dst.next(toResult(origin))
                }

                // console.log("addEventListener", name)
                this.#document[ADD_EVENT_LISTENER](name as keyof DocumentEventMap, listener as any, options)
                return () => {
                    // console.log("removeEventListener", name)
                    this.#document[REMOVE_EVENT_LISTENER](name as keyof DocumentEventMap, listener as any, options)
                }
            })
        )
    }

    #scrollDistance(element: Element): Observable<Position> {
        const scrollPosition = () => {
            let x = 0
            let y = 0
            let p = element
            do {
                x += p.scrollLeft ?? 0
                y += p.scrollTop ?? 0
                p = p.parentNode as Element
            } while (p != null)
            return { x, y }
        }

        return new Observable((dst: Subscriber<Position>) =>
            this.#zone.runOutsideAngular(() => {
                const initial = scrollPosition()
                const listener = () => {
                    const current = scrollPosition()
                    dst.next({ x: current.x - initial.x, y: current.y - initial.y })
                }
                this.#document[ADD_EVENT_LISTENER]("scroll", listener, SCROLL_LISTENER_OPTIONS)
                return () => {
                    this.#document[REMOVE_EVENT_LISTENER]("scroll", listener, SCROLL_LISTENER_OPTIONS)
                }
            })
        )
    }

    #lastTouchAction?: string
    #disableTouchAction = (): void => {
        if (this.#lastTouchAction == null) {
            this.#lastTouchAction = window.getComputedStyle(this.#document.body).touchAction
            this.#document.body.style.touchAction = "none"
        }
    }

    #enableTouchAction = (): void => {
        if (this.#lastTouchAction != null) {
            this.#document.body.style.touchAction = this.#lastTouchAction
            this.#lastTouchAction = undefined
        }
    }
}

function sortByPripority(a: Gesture, b: Gesture) {
    return b.priority - a.priority
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

function updatePointers(state: Mutable<GestureDetail>): GestureDetail {
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
