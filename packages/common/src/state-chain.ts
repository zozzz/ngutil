import {
    catchError,
    concat,
    forkJoin,
    from,
    map,
    Observable,
    ObservableInput,
    of,
    ReplaySubject,
    tap,
    throwError
} from "rxjs"

export type StateChainHandler = () => ObservableInput<unknown> | null | undefined | void

export class StopStateChain extends Error {}

export type StateOptions = Record<string, { order?: "parallel" | "sequential"; cancellable?: boolean }>

export type StateRemap<A, B> =
    A extends StateChain<infer AO, infer AS>
        ? B extends StateChain<infer BO, infer BS>
            ? Partial<{ [K in AS]: BS }>
            : never
        : never

export class StateChain<T extends StateOptions, S extends string | number | symbol = keyof T> {
    readonly states: T
    readonly #executed: S[] = []
    readonly #handlers: Partial<Record<S, Array<StateChainHandler>>> = {}

    #current = new ReplaySubject<S>(1)
    readonly current$ = this.#current.asObservable()

    constructor(states: T) {
        this.states = { ...states }

        for (const value of Object.values(states)) {
            if (value.order == null) {
                value.order = "parallel"
            }
        }
    }

    on(state: S, fn: StateChainHandler) {
        if (state in this.#handlers) {
            this.#handlers[state]!.push(fn)
        } else {
            this.#handlers[state] = [fn]
        }

        return () => {
            const idx = this.#handlers[state]!.indexOf(fn)
            if (idx > -1) {
                this.#handlers[state]!.splice(idx, 1)
            }
        }
    }

    /**
     * Run this state changes on other state
     */
    control<T extends StateChain<any, any>>(state: T, remap?: StateRemap<this, T>) {
        const remove: Array<() => void> = []
        for (const selfState of Object.keys(this.states)) {
            const otherState = (remap as unknown as any)?.[selfState] || selfState
            if (otherState in state.states) {
                remove.push(this.on(selfState as any, () => state.run([otherState])))
            }
        }

        return () => {
            for (const fn of remove) {
                fn()
            }
        }
    }

    run(states: S[]) {
        if (states.length === 0) {
            throw new Error("Missing states")
        }

        const executed: S[] = []
        return concat(...states.map(state => this.#run(state).pipe(tap(s => s && executed.push(s))))).pipe(
            catchError(err => (err instanceof StopStateChain ? of(executed) : throwError(() => err)))
        )
    }

    #run(state: S): Observable<S | null> {
        if (this.#handlers == null) {
            return of(null)
        }
        const options = this.states[state as any]

        return new Observable(dst => {
            if (this.#executed.includes(state)) {
                dst.next(state)
                dst.complete()
                return
            }
            this.#executed.push(state)
            this.#current.next(state)

            const handlers = this.#handlers[state]
            if (handlers == null || handlers.length === 0) {
                dst.next(state)
                dst.complete()
                return
            }

            const observables = handlers
                .map(handler => {
                    const result = handler()
                    if (result == null) {
                        return of(null)
                    } else {
                        return from(result)
                    }
                })
                .map(handler =>
                    handler.pipe(
                        catchError(err => {
                            if (err instanceof StopStateChain) {
                                const idx = this.#executed.indexOf(state)
                                if (idx > -1) {
                                    this.#executed.splice(idx, 1)
                                }
                                dst.error(err)
                                dst.complete()
                                return of(null)
                            } else {
                                return throwError(() => err)
                            }
                        })
                    )
                )

            if (observables.length === 1) {
                return observables[0].pipe(map(() => state)).subscribe(dst)
            } else {
                if (options.order === "parallel") {
                    return forkJoin(observables)
                        .pipe(map(() => state))
                        .subscribe(dst)
                } else {
                    return concat(...observables)
                        .pipe(map(() => state))
                        .subscribe(dst)
                }
            }
        })
    }

    destroy() {
        ;(this as any).#handlers = null as any
    }
}
