import { Directive, input } from "@angular/core"

import { AbstractUiState, NOTSET } from "./abstract"
import { UiState } from "./ui-state"

@Directive({
    selector: "[nuReadonly], [nuReadonlyWhen]",
    exportAs: "readonly",
    standalone: true,
    host: {
        "[attr.aria-readonly]": "yes() ? 'true' : 'false'",
        "[attr.readonly]": "yes() ? '' : null",
        "[attr.inert]": "yes() ? '' : null"
    },
    providers: [UiState]
})
export class ReadonlyDirective extends AbstractUiState<"readonly"> {
    readonly input = input(NOTSET as boolean, { alias: "nuReadonly" })
    readonly when = input(NOTSET as string, { alias: "nuReadonlyWhen" })

    constructor() {
        super("readonly")
    }
}
