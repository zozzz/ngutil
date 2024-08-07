import { computed, Directive, effect, inject, input, signal, Signal } from "@angular/core"

import { Busy } from "./busy"

const INPUT = Symbol("INPUT")

/**
 * @example
 * ```typescript
 * @Component({
 *   standalone: true,
 *   hostDirectives: [DisabledState],
 *   template: `<button [disabled]="disabledState.isDisabled()">Submit</button>`,
 * })
 * export class Button {
 *   readonly disabledState = inject(DisabledState)
 * }
 * ```
 */
@Directive({
    standalone: true,
    exportAs: "nuDisabled",
    host: {
        "[attr.disabled]": "isDisabled()"
    }
})
export class DisabledState {
    readonly #parent = inject(DisabledState, { skipSelf: true, optional: true })
    readonly #busy = inject(Busy, { self: true, optional: true })
    readonly #disabled = signal<boolean>(false)

    readonly isDisabled: Signal<boolean> = computed(
        () => !!(this.#parent?.isDisabled() || this.#busy?.isOthersBusy() || this.#disabled())
    )

    constructor() {
        effect(() => this.isDisabled())
    }

    set(value: boolean) {
        this.#disabled.set(value)
    }
}

/**
 * @example
 * ```html
 *    <form nuDisabled nuBusy="submit">
 *      <button [nuDisabled]="form.invalid" nuBusy="submit">Submit</button>
 *    </form>
 * ```
 */
@Directive({
    standalone: true,
    selector: "[nuDisabled]",
    hostDirectives: [DisabledState]
})
export class Disabled {
    readonly #state = inject(DisabledState, { self: true })
    readonly nuDisabled = input(false)

    constructor() {
        effect(() => this.#state.set(this.nuDisabled()), { allowSignalWrites: true })
    }
}
