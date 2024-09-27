import { Directive, input } from "@angular/core"

import { AbstractUiState, NOTSET } from "./abstract"
import { UiState } from "./ui-state"

@Directive({
    selector: "[nuDisabled], [nuDisabledWhen]",
    exportAs: "disabled",
    standalone: true,
    host: {
        "[attr.aria-disabled]": "yes() ? 'true' : 'false'",
        "[attr.disabled]": "yes() ? 'true' : 'false'",
        "[attr.inert]": "yes() ? '' : null"
    },
    providers: [UiState]
})
export class DisabledDirective extends AbstractUiState<"disabled"> {
    protected readonly input = input(NOTSET as boolean, { alias: "nuDisabled" })
    protected readonly when = input(NOTSET as string, { alias: "nuDisabledWhen" })

    constructor() {
        super("disabled")
    }
}
