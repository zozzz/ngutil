import { Directive, inject, input } from "@angular/core"
import { toObservable, toSignal } from "@angular/core/rxjs-interop"

import { combineLatest, map, Observable, of, shareReplay } from "rxjs"

import { Busy } from "./busy"

/**
 * @example
 * ```html
 *    <form nuDisabled nuBusy="submit">
 *      <button [nuDisabled]="form.invalid" nuBusy="submit">Submit</button>
 *    </form>
 * ```
 */
@Directive({
    selector: "[nuDisabled]",
    exportAs: "nuDisabled"
})
export class Disabled {
    readonly #parent = inject(Disabled, { skipSelf: true, optional: true })
    readonly #busy = inject(Busy, { self: true, optional: true })
    readonly #value = input(false, { alias: "nuDisabled" })

    readonly isDisabled$: Observable<boolean> = combineLatest({
        parent: this.#parent ? this.#parent.isDisabled$ : of(false),
        busy: this.#busy ? this.#busy.isOthersBusy$ : of(false),
        self: toObservable(this.#value)
    }).pipe(
        map(({ parent, busy, self }) => !!(parent || busy || self)),
        shareReplay(1)
    )
    readonly isDisabled = toSignal(this.isDisabled$)
}
