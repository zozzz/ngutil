import {
    computed,
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
import { toObservable, toSignal } from "@angular/core/rxjs-interop"

import {
    BehaviorSubject,
    filter,
    finalize,
    isObservable,
    map,
    Observable,
    scan,
    shareReplay,
    takeUntil,
    tap
} from "rxjs"

import { Destructible } from "./destruct"

export type BusyName = string | "*"
export type BusyProgress = { total: number; current: number; message?: string }
export type BusyEventParams = { busy: boolean; progress?: BusyProgress }
export type BusyEvent = { name: string } & BusyEventParams

export class BusyState<T extends BusyName> {
    readonly #events = new BehaviorSubject<BusyEvent | null>(null)
    readonly events: Observable<BusyEvent> = this.#events.pipe(filter(event => event != null)) as any

    #data: { [key: string]: BusyEventParams } = {}

    readonly changes = this.#events.pipe(
        scan((state, current) => {
            if (current == null) {
                return state
            }
            state[current.name] = { busy: current.busy, progress: current.progress }
            return state
        }, {} as any),
        tap(state => (this.#data = state)),
        map(() => this),
        shareReplay(1)
    )

    get isBusy(): boolean {
        return !!Object.values(this.#data).find(v => v.busy)
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
        if (name === "*") {
            return this.isBusy
        } else {
            return this.#data[name]?.busy === true
        }
    }

    has(name: T): boolean {
        return this.#data[name] != null
    }

    set(name: T, busy: boolean, progress?: BusyProgress) {
        this.#events.next({ name, busy, progress })
    }

    get(name: T) {
        return this.#data[name]
    }
}

/**
 * ```ts
 * @Component({
 *   provides: [BusyTracker],
 *   template: `
 *     <spinner *ngIf="busy.is('reload') | async">
 *     <spinner *ngIf="busy.any | async">
 *     <button busyName="reload"></button>
 *   `
 * })
 * export class Grid {
 *   readonly busy = inject(BusyTracker<"create" | "reload" | "update" | "delete">)
 * }
 * ```
 */
@Injectable({ providedIn: "any" })
export class BusyTracker<T extends BusyName> extends Destructible {
    private readonly _state = this.parent
        ? (this.parent as unknown as { _state: BusyState<T> })._state
        : new BusyState()

    readonly events = this._state.events

    readonly state: Signal<BusyState<T>> = toSignal(this._state.changes, { requireSync: true })

    readonly any = computed(() => this.state().isBusy)

    readonly progress = computed(() => this.state().progress)

    constructor(@Inject(BusyTracker) @SkipSelf() @Optional() private readonly parent?: BusyTracker<any>) {
        super()
    }

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
        return this._state.changes.pipe(map(state => state.is(name)))
    }

    watch(name: T): Observable<BusyEventParams | undefined> {
        return this._state.changes.pipe(
            map(state => {
                const data = state.get(name)
                return data ? { busy: data.busy, progress: data.progress } : undefined
            })
        )
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

    connect(value: Observable<boolean | BusyEventParams> | Signal<boolean>, name: T): void
    connect(value: BusyTracker<any>, prefix?: string): void
    connect(value: Observable<boolean | BusyEventParams> | BusyTracker<any> | Signal<boolean>, name?: string): void {
        if (isObservable(value) && name != null) {
            this.d.sub(value).subscribe(value => {
                if (typeof value === "boolean") {
                    this.set(name as T, value)
                } else {
                    this.set(name as T, value.busy, value.progress)
                }
            })
        } else if (value instanceof BusyTracker) {
            if (name != null) {
                value.d
                    .sub(value.events)
                    .pipe(
                        takeUntil(this.d.on),
                        map(v => {
                            return { ...v, name: `${name}-${v.name}` }
                        })
                    )
                    .subscribe(event => {
                        this.set(event.name as T, event.busy, event.progress)
                    })
            } else {
                value.d
                    .sub(value.events)
                    .pipe(takeUntil(this.d.on))
                    .subscribe(event => {
                        this.set(event.name as T, event.busy, event.progress)
                    })
            }
        } else if (isSignal(value)) {
            this.connect(toObservable(value), name as T)
        }
    }
}

/**
 * ```ts
 * @Component({
 *   template: `
 *     <button busyName="save">SAVE</button>
 *     <progress busyName="fileUpload">
 *     <progress busyName="*">
 *   `
 * })
 * ```
 */
@Directive({
    standalone: true,
    selector: "[busyName]",
    exportAs: "busy"
})
export class Busy<T extends BusyName> {
    readonly tracker: BusyTracker<T> = inject(BusyTracker, { skipSelf: true })

    readonly name: InputSignal<T> = input.required<T>({ alias: "busyName" })

    readonly isBusy = computed(() => this.tracker.state().is(this.name()))

    readonly isOthersBusy = computed(() => {
        const state = this.tracker.state()
        return state.isBusy && !state.is(this.name())
    })

    readonly progress = computed(() => {
        const state = this.tracker.state()
        const data = state.get(this.name())
        return data ? data.progress : undefined
    })
}
