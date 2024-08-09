import { computed, Directive, effect, inject, input, signal, Signal } from "@angular/core"
import { NgControl } from "@angular/forms"

import { Busy } from "./busy"

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
        "[attr.disabled]": "isDisabled() ? '' : null"
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
    readonly #control = inject(NgControl, { self: true, optional: true })
    readonly nuDisabled = input(false)

    constructor() {
        effect(() => this.#state.set(this.nuDisabled()), { allowSignalWrites: true })
        effect(() => {
            const control = this.#control?.control
            if (!control) {
                // TODO: retry
                return
            }

            if (this.#state.isDisabled()) {
                control.enabled && control.disable()
            } else {
                control.disabled && control.enable()
            }
        })
    }
}

// @Directive({
//     standalone: true,
//     // eslint-disable-next-line max-len
//     selector: "[nuDisabled][formControl],[nuDisabled][formControlName],[nuDisabled][formGroup],[nuDisabled][formGroupName]"
// })
// export class FormControlDisabled {
//     readonly #disabled = inject(DisabledState, { self: true })
//     readonly #control = inject(NgControl, { self: true })

//     constructor() {
//         effect(() => {
//             const control = this.#control.control
//             if (!control) {
//                 // TODO: retry
//                 return
//             }

//             if (this.#disabled.isDisabled()) {
//                 control.enabled && control.disable()
//             } else {
//                 control.disabled && control.enable()
//             }
//         })
//     }
// }
