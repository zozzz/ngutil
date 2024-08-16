import { Directive, effect, ElementRef, inject } from "@angular/core"
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop"

import { BehaviorSubject, combineLatest, debounceTime, map, Observable, shareReplay, switchMap } from "rxjs"

import { ElementInput } from "dist/packages/common"

import { ConnectProtocol, isElementInput } from "@ngutil/common"

import { FocusChanges, FocusService } from "./focus.service"

@Directive({
    standalone: true,
    host: {
        "[attr.focus]": "origin()",
        "[attr.focusWithin]": "within()"
    }
})
export class FocusState implements ConnectProtocol {
    readonly #focus = inject(FocusService)
    readonly #el = inject<ElementRef<HTMLElement>>(ElementRef)
    readonly #parent = inject(FocusState, { optional: true, skipSelf: true })
    readonly #default: FocusChanges = { element: this.#el.nativeElement, origin: null }

    readonly #self = this.#focus.watch(this.#el).pipe(takeUntilDestroyed(), shareReplay(1))

    readonly #connected = new BehaviorSubject<Observable<FocusChanges>[]>([])
    readonly #connEvent = this.#connected.pipe(
        switchMap(values => combineLatest(values)),
        takeUntilDestroyed(),
        map(values => values.filter(v => v.origin != null)),
        map(values => values[0] || this.#default),
        shareReplay(1)
    )

    readonly event$: Observable<FocusChanges> = combineLatest([this.#self, this.#connEvent]).pipe(
        debounceTime(100),
        map(values => values.find(v => v.origin != null) || this.#default),
        shareReplay(1)
    )

    readonly origin$ = this.event$.pipe(map(event => event.origin))
    readonly within$ = this.event$.pipe(map(event => (event.element !== this.#el.nativeElement ? event.origin : null)))

    readonly event = toSignal(this.event$, { rejectErrors: true, manualCleanup: true })
    readonly origin = toSignal(this.origin$, { rejectErrors: true, manualCleanup: true })
    readonly within = toSignal(this.within$, { rejectErrors: true, manualCleanup: true })

    constructor() {
        // TODO: miért kell ez?, ha nincs itt akkor nem frissül
        effect(() => this.origin(), { allowSignalWrites: false })
        this.#parent?.connect(this).pipe(takeUntilDestroyed()).subscribe()
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
