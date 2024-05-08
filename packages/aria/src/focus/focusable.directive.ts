import { Attribute, computed, Directive, effect, inject, input } from "@angular/core"

import { DisabledState } from "@ngutil/common"

import { FocusState } from "./focus-state.directive"

// TODO: what happens when disabled is changed

@Directive({
    standalone: true,
    selector: "[nuFocusable]",
    exportAs: "nuFocusable",
    host: {
        "[attr.tabindex]": "tabindex()"
    },
    hostDirectives: [FocusState]
})
export class Focusable {
    readonly #disabled = inject(DisabledState, { optional: true, self: true })

    readonly focusable = input<boolean | number>(true, { alias: "nuFocusable" })

    readonly #tabindex?: number
    readonly tabindex = computed(() => {
        const focusable = this.focusable()

        if (focusable === false || this.#disabled?.isDisabled()) {
            return -1
        }

        if (typeof focusable === "number") {
            return focusable
        }

        if (focusable === true && this.#tabindex != null && !isNaN(this.#tabindex)) {
            return this.#tabindex
        }

        return 0
    })

    constructor(@Attribute("tabindex") tabindex?: string | number) {
        if (tabindex != null) {
            this.#tabindex = Number(tabindex)
        }

        // TODO: miért kell ez?, ha nincs itt akkor nem frissül
        effect(() => this.tabindex(), { allowSignalWrites: false })
    }
}
