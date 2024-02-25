import { DOCUMENT } from "@angular/common"
import { Inject, Injectable, NgZone } from "@angular/core"

import { distinctUntilChanged, filter, Observable, shareReplay, Subject } from "rxjs"

import { Destructible } from "@ngutil/common"

// TODO: detect program activity
export type ActivityOrigin = "mouse" | "keyboard" | "touch" | "program"

export interface ActivityEvent {
    origin: ActivityOrigin
    node?: Node
}

const EVENT_OPTIONS: AddEventListenerOptions = {
    capture: true,
    passive: true
}

@Injectable({ providedIn: "root" })
export class ActivityService extends Destructible {
    #activity!: Subject<ActivityEvent>

    readonly events!: Observable<ActivityEvent>

    constructor(@Inject(DOCUMENT) document: Document, @Inject(NgZone) zone: NgZone) {
        super()

        zone.runOutsideAngular(() => {
            this.#activity = new Subject()
            ;(this as { events: Observable<ActivityEvent> }).events = this.#activity.pipe(
                distinctUntilChanged((prev, curr): boolean => {
                    if (prev && curr) {
                        return prev.origin === curr.origin && prev.node === curr.node
                    } else {
                        return false
                    }
                }),
                shareReplay(1)
            )

            document.addEventListener("keydown", this.#onKeydown, EVENT_OPTIONS)
            document.addEventListener("mousedown", this.#onMouseDown, EVENT_OPTIONS)
            document.addEventListener("mousemove", this.#onMouseMove, EVENT_OPTIONS)
            document.addEventListener("touchstart", this.#onTouchStart, EVENT_OPTIONS)

            this.d.any(() => {
                document.removeEventListener("keydown", this.#onKeydown, EVENT_OPTIONS)
                document.removeEventListener("mousedown", this.#onMouseDown, EVENT_OPTIONS)
                document.removeEventListener("mousemove", this.#onMouseMove, EVENT_OPTIONS)
                document.removeEventListener("touchstart", this.#onTouchStart, EVENT_OPTIONS)
            })
        })
    }

    watchActivity(node?: HTMLElement) {
        if (node) {
            return this.events.pipe(
                filter(
                    event =>
                        event.node != null &&
                        (event.node === node || (event.node instanceof HTMLElement && event.node.contains(node)))
                ),
                shareReplay(1)
            )
        } else {
            return this.events
        }
    }

    watchInactvity(timeout: number) {
        throw Error("Not implemnted yet")
    }

    #onKeydown = (event: KeyboardEvent) => {
        this.#activity.next({ origin: "keyboard", node: event.target as any })
    }

    #onMouseDown = (event: MouseEvent) => {
        this.#activity.next({ origin: "mouse", node: event.target as any })
    }

    #onMouseMove = (event: MouseEvent) => {
        // this.#activity.next({ origin: "mouse" })
    }

    #onTouchStart = (event: TouchEvent) => {
        this.#activity.next({ origin: "touch", node: event.target as any })
    }
}
