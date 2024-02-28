import { DOCUMENT } from "@angular/common"
import { inject, Inject, Injectable, NgZone } from "@angular/core"

import { combineLatest, filter, map, merge, Observable, shareReplay, startWith, Subject } from "rxjs"

import { focusable, type FocusableElement, isFocusable } from "tabbable"

import { Destructible } from "@ngutil/common"

import { ActivityOrigin, ActivityService } from "../activity"

const EVENT_OPTIONS: AddEventListenerOptions = {
    capture: true,
    passive: true
}

export type FocusOrigin = ActivityOrigin | null
// export type FocusTarget = null | "self" | "child"

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
export class FocusService extends Destructible {
    #activity = inject(ActivityService)
    #focus = new Subject<Node>()
    #blur = new Subject<Node>()
    events!: Observable<FocusChanges>

    constructor(@Inject(DOCUMENT) document: Document, @Inject(NgZone) zone: NgZone) {
        super()

        zone.runOutsideAngular(() => {
            const blur = this.#blur.pipe(startWith(null), shareReplay(1))
            const focus = this.#focus.pipe(shareReplay(1))

            const events = combineLatest({
                activity: this.#activity.events,
                focus: focus,
                blur: blur
            }).pipe(
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

            this.events = merge(
                blur.pipe(
                    map(element => {
                        return { origin: null, element }
                    })
                ),
                events
            ).pipe(shareReplay(1)) as any

            document.addEventListener("focus", this.#onFocus, EVENT_OPTIONS)
            document.addEventListener("blur", this.#onBlur, EVENT_OPTIONS)

            this.d.any(() => {
                document.removeEventListener("focus", this.#onFocus, EVENT_OPTIONS)
                document.removeEventListener("blur", this.#onBlur, EVENT_OPTIONS)
            })
        })
    }

    #onFocus = (event: FocusEvent) => {
        this.#focus.next(event.target as Node)
    }

    #onBlur = (event: FocusEvent) => {
        this.#blur.next(event.target as Node)
    }

    watch(node: Node) {
        return this.events.pipe(
            filter(event => event.element && (event.element === node || node.contains(event.element))),
            shareReplay(1)
        )
    }

    focus(node: HTMLElement, _origon: FocusOrigin | null) {
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
}

function isActivityElement(activityEl?: Node | null, focused?: Node | null): boolean {
    return activityEl != null && focused != null && (activityEl === focused || focused.contains(activityEl))
}
