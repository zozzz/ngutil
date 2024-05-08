import {
    computed,
    DestroyRef,
    Directive,
    inject,
    Inject,
    Injectable,
    input,
    InputSignal,
    isSignal,
    Optional,
    Signal,
    SkipSelf
} from "@angular/core"
import { takeUntilDestroyed, toObservable, toSignal } from "@angular/core/rxjs-interop"

import {
    BehaviorSubject,
    combineLatest,
    filter,
    finalize,
    isObservable,
    map,
    Observable,
    scan,
    shareReplay,
    switchMap,
    tap,
    throwError
} from "rxjs"

import { isEqual } from "lodash"

import { ConnectProtocol } from "./connect-protocol"

export type BusyProgress = { total: number; current: number; message?: string }
export type BusyEventParams = { busy?: boolean; progress?: BusyProgress }
export type BusyEvent = { name: string } & BusyEventParams

export type BusyConnectable = Observable<boolean | BusyEventParams> | BusyTracker<any> | Signal<boolean>

export class BusyTrackerState<T extends string> implements ConnectProtocol {
    readonly #events = new BehaviorSubject<BusyEvent | null>(null)

    #data: { [key: string]: BusyEventParams } = {}

    readonly current$ = this.#events.pipe(
        scan((state, current) => {
            if (current == null) {
                return state
            }

            if (current.busy == null) {
                delete state[current.name]
            } else {
                state[current.name] = { busy: current.busy, progress: current.progress }
            }
            return state
        }, {} as any),
        tap(state => (this.#data = state)),
        map(() => this),
        shareReplay(1)
    )

    get isBusy(): boolean {
        return Object.values(this.#data).some(v => v.busy)
    }

    get progress(): BusyProgress | undefined {
        let total = 0
        let current = 0
        const messages = []

        for (const v of Object.values(this.#data)) {
            if (v.progress) {
                total += v.progress.total
                current += v.progress.current
                if (v.progress.message) {
                    messages.push(v.progress.message)
                }
            }
        }

        if (total !== 0 && current !== 0) {
            return { total, current, message: messages.length > 0 ? messages.join("\n") : undefined }
        }

        return undefined
    }

    is(name: T): boolean {
        return this.#data[name]?.busy === true
    }

    has(name: T): boolean {
        return this.#data[name] != null
    }

    set(name: T, busy: boolean | undefined, progress?: BusyProgress) {
        const current = this.#data[name]
        if (current == null || current.busy !== busy || !isEqual(current.progress, progress)) {
            this.#events.next({ name, busy, progress })
        }
    }

    get(name: T): BusyEventParams | undefined {
        return this.#data[name]
    }

    keys() {
        return Object.keys(this.#data)
    }

    entries() {
        return Object.entries(this.#data)
    }

    connect(o: Observable<typeof this> | typeof this, prefix?: string): Observable<unknown> {
        if (o instanceof BusyTrackerState) {
            return this.connect(o.current$, prefix)
        } else {
            return new Observable(() => {
                const otherKeys: string[] = []

                const sub = o.subscribe(otherState => {
                    for (const [k, v] of otherState.entries()) {
                        const key = prefix ? `${prefix}-${k}` : k
                        if (!otherKeys.includes(key)) {
                            otherKeys.push(key)
                        }
                        this.set(key as T, v.busy, v.progress)
                    }
                })

                return () => {
                    sub.unsubscribe()
                    for (const k of otherKeys) {
                        this.set(k as T, undefined, undefined)
                    }
                }
            })
        }
    }
}

/**
 * ```ts
 * @Component({
 *   provides: [BusyTracker],
 *   template: `
 *     <spinner *ngIf="busy.is('reload') | async">
 *     <spinner *ngIf="busy.any | async">
 *     <button nuBusy="reload"></button>
 *   `
 * })
 * export class Grid {
 *   readonly busy = inject(BusyTracker<"create" | "reload" | "update" | "delete">)
 * }
 * ```
 */
@Injectable()
export class BusyTracker<T extends string> implements ConnectProtocol {
    private readonly destroyRef = inject(DestroyRef)

    private readonly _state = this.parent
        ? (this.parent as unknown as { _state: BusyTrackerState<T> })._state
        : new BusyTrackerState()

    readonly state$ = this._state.current$

    readonly state: Signal<BusyTrackerState<T>> = toSignal(this.state$, { requireSync: true })

    readonly any = computed(() => this.state().isBusy)

    readonly progress = computed(() => this.state().progress)

    constructor(@Inject(BusyTracker) @SkipSelf() @Optional() private readonly parent?: BusyTracker<any>) {}

    init(name: T, busy: boolean, progress?: BusyProgress) {
        const state = this.state()
        if (!state.has(name)) {
            this.set(name, busy, progress)
        }
    }

    set(name: T, busy: boolean, progress?: BusyProgress) {
        this._state.set(name, busy, progress)
    }

    is(name: T): Observable<boolean> {
        return this.state$.pipe(map(state => state.is(name)))
    }

    watch(name: T): Observable<BusyEventParams | undefined> {
        return this.state$.pipe(map(state => state.get(name)))
    }

    /**
     * ```ts
     * observable.pipe(this.busy.rx("save"))
     * ```
     */
    rx(name: T) {
        return <S>(src: Observable<S>) =>
            src.pipe(
                tap(() => this.set(name, true)),
                finalize(() => this.set(name, false))
            )
    }

    connect(value: BusyConnectable, name?: T): Observable<unknown> {
        if (isObservable(value)) {
            if (name == null) {
                return throwError(() => new Error("Missing `name` param"))
            }

            return new Observable(() => {
                const sub = value.subscribe(busyValue => {
                    if (typeof busyValue === "boolean") {
                        this.set(name as T, busyValue)
                    } else {
                        this.set(name as T, !!busyValue.busy, busyValue.progress)
                    }
                })
                return sub.unsubscribe.bind(sub)
            }).pipe(takeUntilDestroyed(this.destroyRef))
        } else if (value instanceof BusyTracker) {
            return this._state.connect(value.state$, name).pipe(takeUntilDestroyed(this.destroyRef))
        } else if (isSignal(value)) {
            return this.connect(toObservable(value), name)
        }
        return throwError(() => new Error("Unsupported Busy source"))
    }
}

// TODO: BusyState directive

/**
 * ```ts
 * @Component({
 *   template: `
 *     <button nuBusy="save">SAVE</button>
 *     <progress nuBusy="fileUpload">
 *     <progress nuBusy="*">
 *   `
 * })
 * ```
 */
@Directive({
    standalone: true,
    selector: "[nuBusy]",
    exportAs: "nuBusy"
})
export class Busy<T extends string> implements ConnectProtocol {
    readonly tracker: BusyTracker<T> = inject(BusyTracker, { skipSelf: true })

    readonly name: InputSignal<T> = input.required<T>({ alias: "nuBusy" })
    readonly #name = toObservable(this.name)

    readonly state$ = combineLatest({ name: this.#name, state: this.tracker.state$ }).pipe(
        map(({ name, state }) => {
            if (name === "*") {
                const isBusy = state.isBusy
                return {
                    isBusy: isBusy,
                    isOthersBusy: isBusy,
                    progress: state.progress
                }
            }

            const self = state.get(name)
            if (self) {
                const isBusy = self.busy === true
                return {
                    isBusy: isBusy,
                    isOthersBusy: state.isBusy && !isBusy,
                    progress: self.progress
                }
            } else {
                return {
                    isBusy: false,
                    isOthersBusy: state.isBusy,
                    progress: undefined
                }
            }
        }),
        shareReplay(1)
    )

    readonly isBusy$ = this.state$.pipe(
        map(v => v.isBusy),
        shareReplay(1)
    )
    readonly isBusy = toSignal(this.isBusy$, { rejectErrors: true })

    readonly isOthersBusy$ = this.state$.pipe(
        map(v => v.isOthersBusy),
        shareReplay(1)
    )
    readonly isOthersBusy = toSignal(this.isOthersBusy$, { rejectErrors: true })

    readonly progress$ = this.state$.pipe(
        map(v => v.progress),
        shareReplay(1)
    )
    readonly progress = toSignal(this.progress$, { rejectErrors: true })

    connect(value: BusyConnectable) {
        return new Observable(() => {
            const tsub = this.#name
                .pipe(
                    filter(name => name !== "*"),
                    switchMap(name => this.tracker.connect(value, name))
                )
                .subscribe()
            return tsub.unsubscribe.bind(tsub)
        })
    }
}
