import { inject, NgZone } from "@angular/core"

import { distinctUntilChanged, Observable, shareReplay, Subscriber } from "rxjs"

const WATCHES: { [key: string]: Observable<boolean> } = {}

/**
 * watchMedia("(display-mode: standalone)")
 */
export function watchMedia(expr: string): Observable<boolean> {
    const existing = WATCHES[expr]
    if (existing == null) {
        return (WATCHES[expr] = _createWatcher(expr))
    }
    return existing
}

function _createWatcher(expr: string): Observable<boolean> {
    const zone = inject(NgZone)
    return zone.runOutsideAngular(() =>
        new Observable((sub: Subscriber<boolean>) => {
            const query = window.matchMedia(expr)
            const listener = (event: MediaQueryListEvent) => {
                sub.next(event.matches)
            }
            query.addEventListener("change", listener)
            sub.next(query.matches)
            return () => {
                query.removeEventListener("change", listener)
                delete WATCHES[expr]
            }
        }).pipe(distinctUntilChanged(), shareReplay(1))
    )
}
