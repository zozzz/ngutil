import {
    catchError,
    concat,
    concatMap,
    filter,
    forkJoin,
    from,
    map,
    Observable,
    ObservableInput,
    of,
    reduce,
    ReplaySubject,
    scan,
    share,
    shareReplay,
    Subject,
    Subscriber,
    take,
    takeLast,
    takeUntil,
    takeWhile,
    tap,
    throwError
} from "rxjs"

import { flatten } from "lodash-es"

export type LifecycleHandler = () => ObservableInput<unknown> | null | undefined | void

export class StopLifecycle extends Error {}

export type LifecycleOptions = Record<string, { order?: "parallel" | "sequential"; cancellable?: boolean }>

export type LifecycleRemap<A, B> =
    A extends Lifecycle<infer AO, infer AS>
        ? B extends Lifecycle<infer BO, infer BS>
            ? Partial<{ [K in AS]: BS }>
            : never
        : never

export class Lifecycle<T extends LifecycleOptions, S extends keyof T = keyof T> {
    readonly states: T
    readonly #handlers: Partial<Record<S, Array<LifecycleHandler>>> = {}

    readonly #until = new Subject<void>()
    readonly #trigger = new Subject<S>()
    readonly #status = this.#trigger.pipe(
        takeUntil(this.#until),
        scan(
            (result, trigger) => {
                if (!result[trigger]) {
                    result[trigger] = this.#run(trigger as S).pipe(
                        tap(executed => {
                            if (executed === false) {
                                delete result[trigger]
                            }
                        }),
                        map(executed => [trigger, !!executed] as [S, boolean]),
                        shareReplay(1)
                    )
                }
                return result
            },
            {} as Record<S, Observable<[S, boolean]>>
        ),
        concatMap(triggers => {
            const srcs = Object.values(triggers) as Array<Observable<[S, boolean]>>
            return concat(...srcs).pipe(
                takeWhile(([_, executed]) => executed, false),
                reduce(
                    (result, [name, executed]) => {
                        return { ...result, [name]: executed }
                    },
                    {} as Record<S, boolean>
                )
            )
        }),
        tap(status => {
            if (this.#handlers == null) {
                return
            }

            for (const [k, v] of Object.entries(status)) {
                if (v) {
                    delete (this.#handlers as any)[k]
                }
            }
        }),
        share()
    )

    readonly status$ = this.#status.pipe(shareReplay(1))
    readonly current$ = new ReplaySubject<S>()

    constructor(states: T) {
        this.states = { ...states }

        for (const value of Object.values(states)) {
            if (value.order == null) {
                value.order = "parallel"
            }
        }
    }

    on(state: S, fn: LifecycleHandler) {
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

    onExecute(state: S) {
        return this.current$.pipe(
            takeUntil(this.#until),
            filter(current => current === state)
        )
    }

    onDone(state: S) {
        return this.status$.pipe(
            filter(status => status[state]),
            take(1)
        )
    }

    run(...states: Array<S | S[]>) {
        const flattened = flatten(states).filter((v, i, a) => a.indexOf(v) === i)
        const expectedCount = flattened.length
        return new Observable((dest: Subscriber<void>) => {
            dest.add(
                this.#status.subscribe(currentStatus => {
                    const executedCount = Object.entries(currentStatus).reduce(
                        (result, [name, done]) => result + (done && flattened.includes(name as S) ? 1 : 0),
                        0
                    )

                    if (executedCount >= expectedCount) {
                        dest.next()
                        dest.complete()
                    }
                })
            )

            for (const s of flattened) {
                this.#trigger.next(s)
            }
        })
    }

    /**
     * Run this state changes on other state
     */
    control<T extends Lifecycle<any, any>>(state: T, remap?: LifecycleRemap<this, T>) {
        const remove: Array<() => void> = []

        for (const selfState of Object.keys(this.states)) {
            const otherState = (remap as unknown as any)?.[selfState] || selfState
            if (otherState in state.states) {
                remove.push(this.on(selfState as any, () => state.run(otherState)))
            }
        }

        return () => {
            for (const fn of remove) {
                fn()
            }
        }
    }

    destroy() {
        ;(this as any).#handlers = null
        this.#until.next()
        this.#until.complete()
    }

    #run(state: S) {
        if (this.#handlers == null || !this.states[state]) {
            return of(true)
        }

        return new Observable((dest: Subscriber<boolean>) => {
            this.current$.next(state)

            const handlers = this.#handlers[state]
            if (handlers == null || handlers.length === 0) {
                dest.next(true)
                dest.complete()
                return
            }

            const observables: Array<Observable<any>> = handlers.map(handler => {
                const observable = handler()
                if (observable == null) {
                    return of(null)
                } else {
                    return from(observable)
                }
            })

            const config = this.states[state]

            if (observables.length === 1) {
                return observables[0].pipe(map(() => true)).subscribe(dest)
            } else if (config.order === "parallel") {
                return forkJoin(observables)
                    .pipe(map(() => true))
                    .subscribe(dest)
            } else if (config.order === "sequential") {
                return concat(...observables)
                    .pipe(map(() => true))
                    .subscribe(dest)
            } else {
                dest.next(true)
                dest.complete()
            }

            return
        }).pipe(
            takeLast(1),
            catchError(error => {
                if (error instanceof StopLifecycle) {
                    return of(false)
                } else {
                    return throwError(() => error)
                }
            })
        )
    }
}
