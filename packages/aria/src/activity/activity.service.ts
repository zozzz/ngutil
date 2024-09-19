import { DOCUMENT } from "@angular/common"
import { inject, Injectable, NgZone } from "@angular/core"

import {
    distinctUntilChanged,
    filter,
    fromEvent,
    map,
    merge,
    Observable,
    share,
    shareReplay,
    startWith,
    switchMap,
    take,
    throttleTime,
    timer
} from "rxjs"

// TODO: detect program activity
export type ActivityOrigin = "mouse" | "keyboard" | "touch" | "program"

export interface ActivityEvent {
    origin: ActivityOrigin
    type: keyof typeof EVENT_ORIGIN
    node?: Node
}

const EVENT_OPTIONS: AddEventListenerOptions = {
    capture: true,
    passive: true
}

const EVENT_ORIGIN = {
    keydown: "keyboard",
    mousedown: "mouse",
    mousemove: "mouse",
    touchstart: "touch"
}

@Injectable({ providedIn: "root" })
export class ActivityService {
    readonly #zone = inject(NgZone)
    readonly #doc = inject(DOCUMENT)

    readonly events$: Observable<ActivityEvent> = this.#zone.runOutsideAngular(() =>
        merge(
            fromEvent(this.#doc, "keydown", EVENT_OPTIONS),
            fromEvent(this.#doc, "mousedown", EVENT_OPTIONS),
            fromEvent(this.#doc, "mousemove", EVENT_OPTIONS),
            fromEvent(this.#doc, "touchstart", EVENT_OPTIONS)
        ).pipe(
            map(event => {
                const type = event.type as ActivityEvent["type"]
                return {
                    origin: EVENT_ORIGIN[type] as ActivityOrigin,
                    type: type,
                    node: event.target as any
                }
            }),
            share()
        )
    )

    watchActivity(node?: HTMLElement) {
        if (node) {
            return this.events$.pipe(
                filter(
                    event =>
                        event.node != null &&
                        (event.node === node || (event.node instanceof HTMLElement && event.node.contains(node)))
                ),
                shareReplay(1)
            )
        } else {
            return this.events$
        }
    }

    watchInactvity(timeout: number) {
        return this.events$.pipe(
            startWith(null),
            throttleTime(timeout / 2),
            switchMap(() => timer(0, timeout).pipe(take(2))),
            map(v => v !== 0),
            distinctUntilChanged(),
            shareReplay(1)
        )
    }
}
