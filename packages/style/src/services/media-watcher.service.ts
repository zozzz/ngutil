import { inject, Injectable, NgZone } from "@angular/core"

import { distinctUntilChanged, Observable, shareReplay, Subscriber } from "rxjs"

@Injectable({ providedIn: "root" })
export class MediaWatcher {
    readonly #zone = inject(NgZone)
    #watches: { [key: string]: Observable<boolean> } = {}

    /**
     * svc.watch("(display-mode: standalone)").subscribe(match => {})
     */
    watch(query: string): Observable<boolean> {
        let watcher = this.#watches[query]
        if (!watcher) {
            watcher = this.#newWatcher(query)
            this.#watches[query] = watcher
        }
        return watcher
    }

    #newWatcher(query: string): Observable<boolean> {
        return this.#zone.runOutsideAngular(() =>
            new Observable((sub: Subscriber<boolean>) => {
                const queryWatcher = window.matchMedia(query)
                const listener = (event: MediaQueryListEvent) => {
                    sub.next(event.matches)
                }
                queryWatcher.addEventListener("change", listener)
                sub.next(queryWatcher.matches)
                return () => {
                    queryWatcher.removeEventListener("change", listener)
                    delete this.#watches[query]
                }
            }).pipe(distinctUntilChanged(), shareReplay(1))
        )
    }
}
