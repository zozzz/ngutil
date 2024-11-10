import { Directive, input } from "@angular/core"

import { AbstractUiState, NOTSET } from "./abstract"
import { UiState } from "./ui-state"

@Directive({
    selector: "[nuBusy], [nuBusyWhen]",
    exportAs: "busy",
    standalone: true,
    host: {
        "[attr.aria-busy]": "yes() ? 'true' : 'false'",
        "[attr.inert]": "state.isInert() ? '' : null"
    },
    providers: [UiState]
})
export class BusyDirective extends AbstractUiState<"busy"> {
    readonly input = input(NOTSET as boolean, { alias: "nuBusy" })
    readonly when = input(NOTSET as string, { alias: "nuBusyWhen" })

    constructor() {
        super("busy")
    }
}
