import { ElementRef, inject, Injectable, NgZone } from "@angular/core"

import { distinctUntilChanged, Observable, shareReplay, Subscriber } from "rxjs"

import { Dimension } from "../util/rect"

export type WatchBox = ResizeObserverBoxOptions | "scroll-box"
export type Watches = Map<HTMLElement, Observable<Dimension>>

@Injectable({ providedIn: "root" })
export class DimensionWatcher {
    readonly #zone = inject(NgZone)
    readonly #watches: { [key in WatchBox]?: Watches } = {}

    watch(element: HTMLElement | ElementRef<HTMLElement>, box: WatchBox): Observable<Dimension> {
        let watches = this.#watches[box]
        if (watches == null) {
            watches = new Map()
            this.#watches[box] = watches
        }

        const el = element instanceof ElementRef ? element.nativeElement : element

        let watcher = watches.get(el)
        if (watcher == null) {
            if (box === "scroll-box") {
                watcher = this.#createScollWatcher(watches, el)
            } else {
                watcher = this.#createResizeWatcher(watches, el, box)
            }
            watches.set(el, watcher)
        }

        return watcher
    }

    #createResizeWatcher(watches: Watches, el: HTMLElement, box: WatchBox): Observable<Dimension> {
        if (box !== "border-box") {
            throw new Error(`Currently not implemented box mode: ${box}`)
        }

        return this.#zone.runOutsideAngular(() =>
            new Observable((sub: Subscriber<Dimension>) => {
                const observer = new ResizeObserver(entries => {
                    for (const entry of entries) {
                        if (entry.borderBoxSize) {
                            sub.next({
                                width: entry.borderBoxSize[0].inlineSize,
                                height: entry.borderBoxSize[0].blockSize
                            })
                        } else {
                            sub.next({
                                width: el.offsetWidth,
                                height: el.offsetHeight
                            })
                        }
                    }
                })
                observer.observe(el, { box: box as ResizeObserverBoxOptions })

                return () => {
                    observer.disconnect()
                    watches.delete(el)
                }
            }).pipe(distinctUntilChanged(dimensionIsEq), shareReplay(1))
        )
    }

    #createScollWatcher(watches: Watches, el: HTMLElement): Observable<Dimension> {
        const borderBox = this.watch(el, "border-box")
        return this.#zone.runOutsideAngular(() =>
            new Observable((sub: Subscriber<Dimension>) => {
                let lastSw: number = NaN
                let lastSh: number = NaN

                const emit = () => {
                    const sw = el.scrollWidth
                    const sh = el.scrollHeight
                    if (lastSw !== sw || lastSh !== sh) {
                        lastSw = sw
                        lastSh = sh
                        sub.next({ width: lastSw, height: lastSh })
                    }
                }

                const dimSum = borderBox.subscribe(emit)
                const mutation = new MutationObserver(emit)
                mutation.observe(el, {
                    subtree: true,
                    childList: true,
                    attributes: true,
                    characterData: true
                })
                emit()

                return () => {
                    dimSum.unsubscribe()
                    mutation.disconnect()
                    watches.delete(el)
                }
            }).pipe(distinctUntilChanged(dimensionIsEq), shareReplay(1))
        )
    }
}

function dimensionIsEq(a: Dimension, b: Dimension) {
    return a && b && a.width === b.width && a.height === b.height
}
