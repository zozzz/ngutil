import { Directive, input } from "@angular/core"

import { AbstractUiState, NOTSET } from "./abstract"
import { UiState } from "./ui-state"

@Directive({
    selector: "[nuBusy], [nuBusyWhen]",
    exportAs: "busy",
    standalone: true,
    host: {
        "[attr.aria-busy]": "yes() ? 'true' : 'false'",
        "[attr.inert]": "yes() ? '' : null"
    },
    providers: [UiState]
})
export class BusyDirective extends AbstractUiState<"busy"> {
    protected readonly input = input(NOTSET as boolean, { alias: "nuBusy" })
    protected readonly when = input(NOTSET as string, { alias: "nuBusyWhen" })

    constructor() {
        super("busy")
    }
}
