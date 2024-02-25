import { inject, NgZone } from "@angular/core"

import { distinctUntilChanged, Observable, shareReplay, Subscriber } from "rxjs"

import { NumberWithUnit } from "@ngutil/common"

import { Dimension } from "./dimension"

type Watches = Map<HTMLElement, Observable<Dimension>>
export type WatchBox = ResizeObserverBoxOptions | "scroll-box"

const RESIZE_WATCHES: Watches = new Map()
const SCROLL_WATCHES: Watches = new Map()

export function watchDimension(el: HTMLElement, box: WatchBox = "border-box"): Observable<Dimension> {
    const zone = inject(NgZone)
    return box === "scroll-box" ? _watchScroll(zone, el) : _watchResize(zone, el, box)
}

function _watchResize(zone: NgZone, el: HTMLElement, box: WatchBox) {
    return _watch(zone, el, RESIZE_WATCHES, () => _createResizeWatcher(zone, el, box))
}

function _watchScroll(zone: NgZone, el: HTMLElement) {
    return _watch(zone, el, SCROLL_WATCHES, () => _createScollWatcher(zone, el))
}

function _watch(zone: NgZone, el: HTMLElement, watches: Watches, factory: () => Observable<Dimension>) {
    const existing = watches.get(el)
    if (existing == null) {
        const watcher = factory()
        watches.set(el, watcher)
        return watcher
    }
    return existing
}

function _createResizeWatcher(zone: NgZone, el: HTMLElement, box: WatchBox): Observable<Dimension> {
    if (box !== "border-box") {
        throw new Error(`Currently not implemented box mode: ${box}`)
    }

    return zone.runOutsideAngular(() =>
        new Observable((sub: Subscriber<Dimension>) => {
            const observer = new ResizeObserver(entries => {
                for (const entry of entries) {
                    if (entry.borderBoxSize) {
                        sub.next({
                            width: _number(entry.borderBoxSize[0].inlineSize),
                            height: _number(entry.borderBoxSize[0].blockSize)
                        })
                    } else {
                        sub.next({
                            width: _number(el.offsetWidth),
                            height: _number(el.offsetHeight)
                        })
                    }
                }
            })
            observer.observe(el, { box: box as ResizeObserverBoxOptions })

            return () => {
                observer.disconnect()
                RESIZE_WATCHES.delete(el)
            }
        }).pipe(
            distinctUntilChanged((p, c) => p && c && p.width === c.width && p.height === c.height),
            shareReplay(1)
        )
    )
}

function _createScollWatcher(zone: NgZone, el: HTMLElement): Observable<Dimension> {
    return zone.runOutsideAngular(() =>
        new Observable((sub: Subscriber<Dimension>) => {
            let lastSw: number = 0
            let lastSh: number = 0

            const emit = () => {
                const sw = el.scrollWidth
                const sh = el.scrollHeight
                if (lastSw !== sw || lastSh !== sh) {
                    lastSw = sw
                    lastSh = sh
                    sub.next({ width: _number(lastSw), height: _number(lastSh) })
                }
            }

            const dimSum = _watchResize(zone, el, "border-box").subscribe(emit)
            const mutation = new MutationObserver(emit)
            mutation.observe(el, {
                subtree: true,
                childList: true,
                attributes: true,
                characterData: true
            })

            return () => {
                dimSum.unsubscribe()
                mutation.disconnect()
                SCROLL_WATCHES.delete(el)
            }
        }).pipe(shareReplay(1))
    )
}

function _number(val: number): NumberWithUnit {
    return new NumberWithUnit(val, "pk")
}
