
import { inject, Injectable, NgZone, DOCUMENT } from "@angular/core"

import { combineLatest, distinctUntilChanged, map, Observable, of, shareReplay, Subscriber } from "rxjs"

import { isEqual } from "es-toolkit"

import { coerceElement, ElementInput } from "@ngutil/common"

import { Position } from "../util/rect"

export type WatchPosition = "document" | "viewport"
export type Watches = Map<HTMLElement | Window, Observable<Position>>

@Injectable({ providedIn: "root" })
export class PositionWatcher {
    readonly #zone = inject(NgZone)
    readonly #document = inject(DOCUMENT)
    readonly #watches: Record<WatchPosition, Watches> = {} as any

    watch(element: ElementInput | Window, position: WatchPosition = "viewport"): Observable<Position> {
        if (element instanceof Window) {
            return of({ x: 0, y: 0 })
        }

        element = coerceElement(element)

        const watchers = this.#watches[position] ??= new Map()

        let watcher = watchers.get(element)
        if (watcher == null) {
            if (position === "document") {
                watcher = this.#createDocumentWatcher(element)
            } else {
                watcher = this.#createViewportWatcher(element)
            }
            watchers.set(element, watcher)
        }

        return watcher
    }

    #createDocumentWatcher(element: HTMLElement): Observable<Position> {
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

    #createViewportWatcher(element: HTMLElement): Observable<Position> {
        const relative = this.#relativeElement(element)
        if (relative == null) {
            return this.#createDocumentWatcher(element)
        }

        return this.#zone.runOutsideAngular(() => {
            const relativePosition$ = this.watch(relative)
            const elementPosition$ = this.#createDocumentWatcher(element)

            return combineLatest({ relative: relativePosition$, element: elementPosition$ }).pipe(
                map(({ relative, element }) => ({
                    x: element.x - relative.x,
                    y: element.y - relative.y
                })),
                shareReplay(1)
            )
        })
    }

    #relativeElement(element: HTMLElement): HTMLElement | undefined {
        let parent = element.parentElement
        while (parent) {
            const style = getComputedStyle(parent)
            if (style.position === "sticky" || style.position === "fixed") {
                return parent
            }
            parent = parent.parentElement
        }
        return undefined
    }
}
