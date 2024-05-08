import { computed, Directive, effect, ElementRef, inject } from "@angular/core"
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop"

import { shareReplay } from "rxjs"

import { FocusService } from "./focus.service"

@Directive({
    standalone: true,
    host: {
        "[attr.focus]": "origin()",
        "[attr.focusWithin]": "within()"
    }
})
export class FocusState {
    readonly #focus = inject(FocusService)
    readonly #el = inject<ElementRef<HTMLElement>>(ElementRef)

    readonly #event = this.#focus.watch(this.#el.nativeElement).pipe(takeUntilDestroyed(), shareReplay(1))
    readonly event = toSignal(this.#event, { rejectErrors: true, manualCleanup: true })

    readonly origin = computed(() => this.event()?.origin)

    readonly within = computed(() => {
        const event = this.event()
        return event ? (event.element !== this.#el.nativeElement ? event.origin : null) : null
    })

    constructor() {
        // TODO: miért kell ez?, ha nincs itt akkor nem frissül
        effect(() => this.origin(), { allowSignalWrites: false })
    }
}
