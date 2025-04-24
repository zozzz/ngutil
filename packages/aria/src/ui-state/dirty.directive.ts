import { Directive, input } from "@angular/core"

import { AbstractUiState, NOTSET } from "./abstract"
import { UiState } from "./ui-state"

@Directive({
    selector: "[nuDirty], [nuDirtyWhen]",
    exportAs: "dirty",
    host: {
        "[attr.dirty]": "yes() ? '' : null"
    },
    providers: [UiState]
})
export class DirtyDirective extends AbstractUiState<"dirty"> {
    readonly input = input(NOTSET as boolean, { alias: "nuDirty" })
    readonly when = input(NOTSET as string, { alias: "nuDirtyWhen" })

    constructor() {
        super("dirty")
    }
}
