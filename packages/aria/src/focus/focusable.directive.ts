import { computed, Directive, effect, inject, input } from "@angular/core"

import { ConnectProtocol, ElementInput, isElementInput } from "@ngutil/common"

import { FocusState } from "./focus-state.directive"

// TODO: what happens when disabled is changed

@Directive({
    selector: "[nuFocusable]",
    exportAs: "nuFocusable",
    host: {
        "[attr.tabindex]": "_tabindex()"
    },
    hostDirectives: [FocusState]
})
export class Focusable implements ConnectProtocol {
    readonly state = inject(FocusState)

    readonly focusable = input<boolean | number>(true, { alias: "nuFocusable" })
    readonly tabindex = input(0, { transform: Number })

    readonly _tabindex = computed(() => {
        const focusable = this.focusable()
        const tabindex = this.tabindex()

        if (focusable === false) {
            return -1
        }

        if (typeof focusable === "number") {
            return focusable
        }

        if (focusable === true && tabindex != null && !isNaN(tabindex)) {
            return tabindex
        }

        return 0
    })

    constructor() {
        // TODO: miért kell ez?, ha nincs itt akkor nem frissül
        effect(() => this._tabindex(), { allowSignalWrites: false })
    }

    connect(value: Focusable | FocusState | ElementInput) {
        if (value instanceof FocusState || isElementInput(value)) {
            return this.state.connect(value)
        } else {
            return this.state.connect(value.state)
        }
    }
}
