import { Directive, input } from "@angular/core"

import { AbstractUiState, NOTSET } from "./abstract"
import { UiState } from "./ui-state"

@Directive({
    selector: "[nuDisabled], [nuDisabledWhen]",
    exportAs: "disabled",
    host: {
        "[attr.aria-disabled]": "yes() ? 'true' : 'false'",
        "[attr.disabled]": "yes() ? '' : null",
        "[attr.inert]": "state.isInert() ? '' : null"
    },
    providers: [UiState]
})
export class DisabledDirective extends AbstractUiState<"disabled"> {
    readonly input = input(NOTSET as boolean, { alias: "nuDisabled" })
    readonly when = input(NOTSET as string, { alias: "nuDisabledWhen" })

    constructor() {
        super("disabled")
    }
}
