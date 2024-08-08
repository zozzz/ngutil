import { FocusTrapFactory } from "@angular/cdk/a11y"
import { DOCUMENT } from "@angular/common"
import { inject, Inject, Injectable, NgZone } from "@angular/core"
import { takeUntilDestroyed } from "@angular/core/rxjs-interop"

import { combineLatest, filter, fromEvent, map, Observable, shareReplay, startWith } from "rxjs"

import { focusable, type FocusableElement, isFocusable } from "tabbable"

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
    readonly events: Observable<FocusChanges>

    constructor(@Inject(DOCUMENT) document: Document, @Inject(NgZone) zone: NgZone) {
        this.events = zone.runOutsideAngular(() => {
            const focus = fromEvent(document, "focus", EVENT_OPTIONS).pipe(map(e => e.target as Node))
            const blur = fromEvent(document, "blur", EVENT_OPTIONS).pipe(
                startWith(null),
                map(e => (e?.target as Node) || null)
            )

            return combineLatest({
                activity: this.#activity.events,
                focus: focus,
                blur: blur
            }).pipe(
                takeUntilDestroyed(),
                map(({ activity, focus, blur }) => {
                    // console.log({ activity, focus, blur })

                    // If focus in with alt+tab
                    if (blur === document && activity.origin === "keyboard") {
                        return { origin: "program", element: focus }
                    }

                    if (focus === document) {
                        return { origin: "program", element: focus }
                    }

                    // If press tab button, first fire the event in the currently focused element
                    if (focus === blur) {
                        return null
                    }

                    // When press tab, the activity is on the current fucesd element,
                    // so when blur is changed to it, the focus change is completed
                    if (activity.origin === "keyboard" && isActivityElement(activity.node, blur)) {
                        return { origin: "keyboard", element: focus }
                    }

                    if (isActivityElement(activity.node, focus)) {
                        return { origin: activity.origin, element: focus }
                    } else {
                        return { origin: "program", element: focus }
                    }
                }),
                filter(v => !!v),
                shareReplay(1)
            ) as any
        })
    }

    watch(node: Node) {
        return this.events.pipe(
            map(event => {
                if (
                    event.element &&
                    (event.element === node || (typeof node.contains === "function" && node.contains(event.element)))
                ) {
                    return event
                }
                return { element: node, origin: null }
            })
        )
    }

    focus(node: HTMLElement, _origin: FocusOrigin | null) {
        // TODO: focus origin
        node.focus()
    }

    queryFocusable(inside: HTMLElement): FocusableElement[] {
        return focusable(inside, { includeContainer: false })
    }

    getFirstFocusable(inside: HTMLElement): FocusableElement | undefined {
        return this.queryFocusable(inside)[0]
    }

    isFocusable(node: Element): boolean {
        return isFocusable(node)
    }

    focusTrap(inside: HTMLElement, deferCaptureElements: boolean = false) {
        return this.#focusTrap.create(inside, deferCaptureElements)
    }
}

function isActivityElement(activityEl?: Node | null, focused?: Node | null): boolean {
    return activityEl != null && focused != null && (activityEl === focused || focused.contains(activityEl))
}
