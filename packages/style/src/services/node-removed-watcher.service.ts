import { inject, Injectable, NgZone } from "@angular/core"

import { finalize, Observable } from "rxjs"

import { coerceElement, type ElementInput } from "@ngutil/common"

@Injectable({ providedIn: "root" })
export class NodeRemovedWatcher {
    readonly #zone = inject(NgZone)
    #watches = new Map<HTMLElement, Observable<void>>()

    watch(element: ElementInput): Observable<void> {
        element = coerceElement(element)
        let watcher = this.#watches.get(element)
        if (watcher == null) {
            watcher = this.#createWatcher(element).pipe(
                finalize(() => this.#watches.delete(element))
            )
            this.#watches.set(element, watcher)
        }
        return watcher
    }

    #createWatcher(element: HTMLElement): Observable<void> {
        return this.#zone.runOutsideAngular(
            () =>
                new Observable<void>(dst => {
                    this.#zone.runOutsideAngular(() => {
                        const observer = new MutationObserver(mutations => {
                            for (const mutation of mutations) {
                                if (Array.from(mutation.removedNodes).includes(element)) {
                                    dst.next()
                                    dst.complete()
                                    return
                                }
                            }
                        })

                        observer.observe(element.parentNode!, { childList: true })

                        return () => {
                            observer.disconnect()
                        }
                    })
                })
        )
    }
}
