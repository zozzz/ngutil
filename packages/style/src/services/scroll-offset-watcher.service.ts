import { DOCUMENT, inject, Inject, Injectable, NgZone } from "@angular/core"
import type { Position } from "../util/rect"
import { combineLatest, distinctUntilChanged, finalize, map, Observable, shareReplay, tap } from "rxjs"

import { coerceElement, ElementInput, isEqual } from "@ngutil/common"

export type Watches = Map<HTMLElement | Window, Observable<Position>>

@Injectable({providedIn: "root"})
export class ScrollOffsetWatcher {
    readonly #zone = inject(NgZone)
    readonly #watches: Watches = new Map()

    watch(element: ElementInput | Window, ): Observable<Position> {
        element = coerceElement(element)
        let watcher = this.#watches.get(element)
        if (watcher == null) {
            watcher = this.#createWatcher(element).pipe(
                finalize(() => this.#watches.delete(element)),
                shareReplay({refCount: true, bufferSize: 1})
            )
            this.#watches.set(element, watcher)
        }
        return watcher
    }

    #createWatcher(element: HTMLElement | Window): Observable<Position> {
        if (element instanceof Window) {
            return this.#createElementWatcher(element)
        }

        const watchers = []
        let el: HTMLElement | null = coerceElement(element)
        while (el) {
            if (el.tagName === "BODY") {
                watchers.push(this.#createElementWatcher(window))
                break
            }
            watchers.push(this.#createElementWatcher(el))
            el = el.parentElement
        }

        return combineLatest(watchers).pipe(
            map(positions => positions.reduce((acc, pos) => ({x: acc.x + pos.x, y: acc.y + pos.y}), {x: 0, y: 0})),
            distinctUntilChanged(isEqual)
        )
    }

    #createElementWatcher(element: HTMLElement | Window): Observable<Position> {
        console.log("create scroll watcher for", element)
        return this.#zone.runOutsideAngular(() =>
            new Observable<Position>(dst => {
                const handler = element instanceof Window
                    ? () => dst.next({x: element.scrollX, y: element.scrollY})
                    : () => dst.next({x: element.scrollLeft, y: element.scrollTop})
                handler()
                element.addEventListener("scroll", handler, {capture: true, passive: true})
                return () => element.removeEventListener("scroll", handler, {capture: true})

            }).pipe(distinctUntilChanged(isEqual))
        )
    }
}
