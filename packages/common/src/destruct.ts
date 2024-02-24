import { Directive, OnDestroy } from "@angular/core"

import { Observable, share, Subject, take, takeUntil } from "rxjs"

export interface IDisposable {
    dispose(): void
}

export class Destruct {
    readonly #on = new Subject<void>()
    readonly on = this.#on.pipe(share())

    constructor(fn?: () => void) {
        if (fn != null) {
            this.any(fn)
        }
    }
    get done(): boolean {
        return this.#on.closed
    }

    sub<T>(o: Observable<T>): Observable<T> {
        if (this.done) {
            return o.pipe(take(0))
        } else {
            return o.pipe(takeUntil(this.on))
        }
    }

    disposable<T extends IDisposable>(d: T): T {
        if (this.done) {
            d.dispose()
        } else {
            this.on.subscribe(d.dispose.bind(d))
        }

        return d
    }

    node<T extends Node>(el: T): T {
        const remove = () => {
            const parent = el.parentNode
            if (parent) {
                parent.removeChild(el)
            }
        }
        if (this.done) {
            remove()
        } else {
            this.on.subscribe(remove)
        }

        return el
    }

    any(f: () => void): void {
        if (this.done) {
            f()
        } else {
            this.on.subscribe(f)
        }
    }

    run() {
        if (!this.done) {
            this.#on.next()
            this.#on.complete()
        }
    }
}

@Directive()
export abstract class Destructible implements OnDestroy, IDisposable {
    /** @ignore */
    readonly d = new Destruct()

    /** @ignore */
    ngOnDestroy() {
        this.d.run()
        delete (this as any).d
    }

    /** @ignore */
    dispose() {
        this.ngOnDestroy()
    }
}
