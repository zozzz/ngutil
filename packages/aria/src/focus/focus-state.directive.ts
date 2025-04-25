import { computed, Directive, ElementRef, inject } from "@angular/core"
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop"

import {
    BehaviorSubject,
    combineLatest,
    distinctUntilChanged,
    map,
    Observable,
    of,
    shareReplay,
    switchMap,
    tap
} from "rxjs"

import { ConnectProtocol, ElementInput, isElementInput, isEqual } from "@ngutil/common"

import { FocusOrigin, FocusOriginEvent, FocusService } from "./focus.service"

@Directive({
    host: {
        "[attr.focus]": "self()",
        "[attr.focus-within]": "within()",
        "[attr.focus-present]": "has()"
    }
})
export class FocusState implements ConnectProtocol {
    readonly #focus = inject(FocusService)
    readonly #el = inject<ElementRef<HTMLElement>>(ElementRef)
    readonly #parent = inject(FocusState, { optional: true, skipSelf: true })
    readonly #default: FocusOriginEvent = { element: this.#el.nativeElement, origin: null }

    readonly #self = this.#focus.watch(this.#el).pipe(takeUntilDestroyed(), shareReplay(1))

    readonly #connected = new BehaviorSubject<Observable<FocusOriginEvent>[]>([])
    readonly #connEvent = this.#connected.pipe(
        switchMap(values => (values.length === 0 ? of([]) : combineLatest(values))),
        takeUntilDestroyed(),
        map(values => values.filter(v => v.origin != null)),
        map(values => values[0] || this.#default),
        shareReplay(1)
    )

    readonly event$: Observable<FocusOriginEvent> = combineLatest([this.#self, this.#connEvent]).pipe(
        tap(v => console.log(this.#el.nativeElement, v[0], v[1])),
        // debounceTime(100), // TODO: miért volt ez itt?
        map(([self, conn]) => (self.origin !== null ? self : conn.origin !== null ? conn : this.#default)),
        distinctUntilChanged(isEqual),
        shareReplay(1)
    )

    readonly event = toSignal(this.event$, { rejectErrors: true, manualCleanup: true, equal: isEqual })

    readonly self = computed<FocusOrigin>(() => {
        const event = this.event()
        if (event == null) {
            return null
        }
        return event.element === this.#el.nativeElement ? event.origin : null
    })

    readonly within = computed<FocusOrigin>(() => {
        const event = this.event()
        if (event == null) {
            return null
        }
        return event.element !== this.#el.nativeElement ? event.origin : null
    })

    readonly has = computed<FocusOrigin>(() => this.self() || this.within())

    constructor() {
        this.#parent?.connect(this).pipe(takeUntilDestroyed()).subscribe()
        // effect(() => {
        //     console.log(this.#el.nativeElement, this.has())
        // })
    }

    connect(value: FocusState | ElementInput) {
        return new Observable(() => {
            const src = (isElementInput(value) ? this.#focus.watch(value) : value.event$).pipe(shareReplay(1))
            this.#connected.next([...this.#connected.value, src])

            return () => {
                let current = this.#connected.value
                const idx = current.indexOf(src)
                if (idx >= 0) {
                    current = [...current]
                    current.splice(idx, 1)
                    this.#connected.next(current)
                }
            }
        })
    }
}
