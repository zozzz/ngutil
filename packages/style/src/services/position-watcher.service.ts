
import { inject, Injectable, NgZone, DOCUMENT } from "@angular/core"

import { distinctUntilChanged, Observable, of, shareReplay, Subscriber } from "rxjs"

import { isEqual } from "es-toolkit"

import { coerceElement, ElementInput } from "@ngutil/common"

import { Position } from "../util/rect"

@Injectable({ providedIn: "root" })
export class PositionWatcher {
    readonly #zone = inject(NgZone)
    readonly #document = inject(DOCUMENT)
    readonly #watches: Map<HTMLElement, Observable<Position>> = new Map()

    watch(element: ElementInput | Window): Observable<Position> {
        if (element instanceof Window) {
            return of({ x: 0, y: 0 })
        }

        element = coerceElement(element)

        let watcher = this.#watches.get(element)
        if (watcher == null) {
            watcher = this.#createWatcher(element)
            this.#watches.set(element, watcher)
        }

        return watcher
    }

    #createWatcher(element: HTMLElement): Observable<Position> {
        return this.#zone.runOutsideAngular(() =>
            new Observable((dest: Subscriber<Position>) => {
                let rafId: number | undefined = undefined
                const emit = () => {
                    if (this.#document.contains(element)) {
                        const {x, y} = element.getBoundingClientRect()
                        dest.next({x, y})
                    }

                    if (!dest.closed) {
                        rafId = requestAnimationFrame(emit)
                    }
                }
                emit()
                return () => {
                    rafId && cancelAnimationFrame(rafId)
                }
            }).pipe(distinctUntilChanged(isEqual), shareReplay(1))
        )
    }
}
