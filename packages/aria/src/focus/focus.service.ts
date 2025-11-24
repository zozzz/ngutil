import { FocusTrapFactory } from "@angular/cdk/a11y"

import { inject, Injectable, NgZone, DOCUMENT } from "@angular/core"

import {
    BehaviorSubject,
    combineLatest,
    connect,
    distinctUntilChanged,
    filter,
    finalize,
    map,
    merge,
    Observable,
    of,
    scan,
    shareReplay,
    Subject,
    Subscriber,
    switchMap,
    tap,
    timer
} from "rxjs"

import { focusable, type FocusableElement, isFocusable } from "tabbable"

import { coerceElement, ElementInput, isEqual, isEqualStrict } from "@ngutil/common"

import { ActivityEvent, ActivityOrigin, ActivityService } from "../activity"

const EVENT_OPTIONS: AddEventListenerOptions = {
    capture: true,
    passive: true
}

export type FocusOrigin = ActivityOrigin | null

export interface FocusOriginEvent {
    element: Node
    origin: FocusOrigin
}

interface EventState {
    activity?: ActivityEvent
    focus?: Node
    blur?: Node
    nextOrigin?: FocusOrigin
    event?: FocusOriginEvent
    deferred?: FocusOriginEvent
}

@Injectable({ providedIn: "root" })
export class FocusService {
    readonly #activity = inject(ActivityService)
    readonly #focusTrap = inject(FocusTrapFactory)
    readonly #zone = inject(NgZone)
    readonly #document = inject(DOCUMENT)

    readonly #originOverrides = new BehaviorSubject<Map<Node, ActivityOrigin>>(new Map())

    readonly #focus: Observable<Node> = listener(this.#document, this.#zone, "focus", EVENT_OPTIONS).pipe(
        connect(focus =>
            this.#zone.runOutsideAngular(() => {
                let lastFocused: Node | null = null
                const sideEffect = new Subject<Node>()

                // if element removed form document, emit blur & focus
                const mutation = new MutationObserver(mutations => {
                    for (const mutation of mutations) {
                        if (mutation.type === "childList" && mutation.removedNodes.length > 0) {
                            for (const removed of Array.from(mutation.removedNodes)) {
                                if (removed === lastFocused || removed.contains(lastFocused)) {
                                    this.#blurSide.next(lastFocused!)
                                    sideEffect.next(this.#document.activeElement!)
                                    return
                                }
                            }
                        }
                    }
                })

                mutation.observe(this.#document, { subtree: true, childList: true })
                return merge(
                    focus.pipe(
                        tap(node => (lastFocused = node)),
                        finalize(() => mutation.disconnect())
                    ),
                    sideEffect
                )
            })
        ),

        distinctUntilChanged(isEqualStrict)
    )

    readonly #blurEvent = listener(this.#document, this.#zone, "blur", EVENT_OPTIONS)
    readonly #blurSide = new Subject<Node>()
    readonly #blur: Observable<Node> = merge(this.#blurEvent, this.#blurSide).pipe(distinctUntilChanged(isEqualStrict))

    readonly events: Observable<FocusOriginEvent> = this.#zone.runOutsideAngular(() => {
        const activity = this.#activity.events$.pipe(
            filter(activity => activity.type !== "mousemove"),
            map(activity => ({ activity }) satisfies Partial<EventState>)
        )
        const focus = this.#focus.pipe(map(focus => ({ focus }) satisfies Partial<EventState>))
        const blur = this.#blur.pipe(map(blur => ({ blur }) satisfies Partial<EventState>))

        const event = merge(activity, focus, blur).pipe(
            scan<EventState, EventState>((state, curr) => {
                const result: EventState = { ...state, event: undefined, deferred: undefined }

                if (curr.blur != null) {
                    if (curr.blur === state.focus) {
                        result.deferred = { element: curr.blur, origin: null }
                    } else if (state.deferred && state.deferred.origin == null) {
                        result.deferred = state.deferred
                    }
                } else if (curr.focus != null) {
                    if (
                        curr.focus === document &&
                        state.blur === curr.focus &&
                        (!state.deferred || !state.deferred.origin)
                    ) {
                        result.deferred = { element: curr.focus, origin: null }
                        result.nextOrigin = "program"
                        return result
                    }

                    if (state.nextOrigin) {
                        result.event = { element: curr.focus, origin: state.nextOrigin }
                        result.nextOrigin = undefined
                    } else if (state.activity) {
                        result.event = { element: curr.focus, origin: state.activity.origin }
                    }
                } else if (curr.activity) {
                    delete result.nextOrigin
                    if (
                        state.event &&
                        curr.activity.origin !== "keyboard" &&
                        state.event.origin !== curr.activity.origin
                    ) {
                        result.deferred = { ...state.event, origin: curr.activity.origin }
                    }
                }
                return { ...result, ...curr }
            }, {} as EventState),
            switchMap(state => {
                if (state.deferred) {
                    return timer(20).pipe(
                        map(() => {
                            state.event = state.deferred
                            delete state.deferred
                            return state
                        })
                    )
                } else {
                    return of(state)
                }
            }),
            map(state => state.event),
            filter(event => !!event)
        )

        return combineLatest({ event, overrides: this.#originOverrides }).pipe(
            map(({ event, overrides }) => {
                const override = overrides.get(event.element)

                if (override != null) {
                    overrides.delete(event.element)
                    event.origin = override || event.origin
                }

                return event
            }),
            distinctUntilChanged(isEqual),
            shareReplay({ bufferSize: 1, refCount: true })
        )
    })

    watch(element: ElementInput) {
        const el = coerceElement(element)
        return this.events.pipe(
            map(event => {
                if (event.element && (event.element === el || el.contains(event.element))) {
                    return event
                }
                return { element: el, origin: null } as FocusOriginEvent
            })
        )
    }

    focus(node: ElementInput, origin?: ActivityOrigin) {
        if (origin != null) {
            this.#setOrigin(node, origin)
        }
        coerceElement(node).focus()
    }

    queryFocusable(inside: ElementInput): FocusableElement[] {
        return focusable(coerceElement(inside), { includeContainer: false })
    }

    getFirstFocusable(inside: ElementInput): FocusableElement | undefined {
        return this.queryFocusable(inside)[0]
    }

    isFocusable(node: ElementInput): boolean {
        return isFocusable(coerceElement(node))
    }

    focusTrap(inside: ElementInput, deferCaptureElements: boolean = false) {
        return this.#focusTrap.create(coerceElement(inside), deferCaptureElements)
    }

    #setOrigin(el: ElementInput, origin: ActivityOrigin) {
        const target = coerceElement(el)
        const map = this.#originOverrides.value
        const old = map.get(target)
        if (old !== origin) {
            map.set(target, origin)
            this.#originOverrides.next(map)
        }
    }

    #delOrigin(el: ElementInput) {
        const target = coerceElement(el)
        const map = this.#originOverrides.value
        if (map.has(target)) {
            map.delete(target)
            this.#originOverrides.next(map)
        }
    }
}

function listener(doc: Document, zone: NgZone, type: Event["type"], options: AddEventListenerOptions) {
    return new Observable((dst: Subscriber<Node>) =>
        zone.runOutsideAngular(() => {
            const handler = (e: Event) => {
                dst.next(e.target! as Node)
            }
            document.addEventListener(type, handler, options)
            return () => document.removeEventListener(type, handler, options)
        })
    )
}
