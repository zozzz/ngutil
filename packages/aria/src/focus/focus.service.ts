import { FocusTrapFactory } from "@angular/cdk/a11y"
import { DOCUMENT } from "@angular/common"
import { inject, Injectable, NgZone } from "@angular/core"
import { takeUntilDestroyed } from "@angular/core/rxjs-interop"

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
    shareReplay,
    startWith,
    Subject,
    Subscriber,
    tap
} from "rxjs"

import { isEqual } from "lodash-es"
import { focusable, type FocusableElement, isFocusable } from "tabbable"

import { coerceElement, ElementInput } from "@ngutil/common"

import { ActivityOrigin, ActivityService } from "../activity"

const EVENT_OPTIONS: AddEventListenerOptions = {
    capture: true,
    passive: true
}

export type FocusOrigin = ActivityOrigin | null

export interface FocusChanges {
    origin: FocusOrigin
    element: HTMLElement
}

export interface FocusableEvent {
    origin: FocusOrigin
    exact: boolean
    node: Node
}

@Injectable({ providedIn: "root" })
export class FocusService {
    readonly #activity = inject(ActivityService)
    readonly #focusTrap = inject(FocusTrapFactory)
    readonly #zone = inject(NgZone)
    readonly #document = inject(DOCUMENT)

    readonly #originOverrides = new BehaviorSubject<Map<HTMLElement, FocusOrigin>>(new Map())

    readonly #focus = listener(this.#document, this.#zone, "focus", EVENT_OPTIONS).pipe(
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

        distinctUntilChanged(strictEq)
    )

    readonly #blurEvent = listener(this.#document, this.#zone, "blur", EVENT_OPTIONS).pipe(startWith(null))
    readonly #blurSide = new Subject<Node>()
    readonly #blur = merge(this.#blurEvent, this.#blurSide).pipe(distinctUntilChanged(strictEq))

    readonly events: Observable<FocusChanges> = this.#zone.runOutsideAngular(() =>
        combineLatest({
            activity: this.#activity.events$.pipe(filter(event => event.type !== "mousemove")),
            focus: this.#focus,
            blur: this.#blur.pipe(tap(el => this.#delOrigin(el as any))),
            overrides: this.#originOverrides
        }).pipe(
            takeUntilDestroyed(),
            map(({ activity, focus, blur, overrides }) => {
                const override = overrides.get(focus as any)

                // If focus in with alt+tab
                if (blur === document && activity.origin === "keyboard") {
                    return { origin: override || "program", element: focus } satisfies FocusChanges
                }

                if (focus === document) {
                    return { origin: override || "program", element: focus } satisfies FocusChanges
                }

                // If press tab button, first fire the event in the currently focused element
                if (focus === blur) {
                    return null
                }

                // When press tab, the activity is on the current fucesd element,
                // so when blur is changed to it, the focus change is completed
                if (activity.origin === "keyboard" && isActivityElement(activity.node, blur)) {
                    return { origin: override || "keyboard", element: focus } satisfies FocusChanges
                }

                if (isActivityElement(activity.node, focus)) {
                    return { origin: override || activity.origin, element: focus }
                } else {
                    return { origin: override || "program", element: focus } satisfies FocusChanges
                }
            }),
            filter(v => !!v),
            distinctUntilChanged(isEqual),
            shareReplay({ bufferSize: 1, refCount: true })
        )
    )

    watch(element: ElementInput) {
        const el = coerceElement(element)
        return this.events.pipe(
            map(event => {
                if (
                    event.element &&
                    (event.element === el || (typeof el.contains === "function" && el.contains(event.element)))
                ) {
                    return event
                }
                return { element: el, origin: null } as FocusChanges
            })
        )
    }

    focus(node: ElementInput, origin: FocusOrigin | null) {
        this.#setOrigin(node, origin)
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

    #setOrigin(el: ElementInput, origin: FocusOrigin) {
        const target = coerceElement(el)
        const map = this.#originOverrides.value
        map.set(target, origin)
        this.#originOverrides.next(map)
    }

    #delOrigin(el: ElementInput) {
        const target = coerceElement(el)
        const map = this.#originOverrides.value
        map.delete(target)
        this.#originOverrides.next(map)
    }
}

function isActivityElement(activityEl?: Node | null, focused?: Node | null): boolean {
    return activityEl != null && focused != null && (activityEl === focused || focused.contains(activityEl))
}

function listener(doc: Document, zone: NgZone, type: Event["type"], options: AddEventListenerOptions) {
    return new Observable((dst: Subscriber<Node>) =>
        zone.runOutsideAngular(() => {
            const handler = (e: Event) => {
                dst.next(e.target as Node)
            }
            document.addEventListener(type, handler, options)
            return () => document.removeEventListener(type, handler, options)
        })
    )
}

function strictEq(a: any, b: any): boolean {
    return a === b
}
