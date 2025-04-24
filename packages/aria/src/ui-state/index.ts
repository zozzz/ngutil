import { NgModule } from "@angular/core"

import { BusyDirective } from "./busy.directive"
import { DirtyDirective } from "./dirty.directive"
import { DisabledDirective } from "./disabled.directive"
import { ReadonlyDirective } from "./readonly.directive"

export * from "./abstract"
export * from "./busy.directive"
export * from "./disabled.directive"
export * from "./progress-state"
export * from "./readonly.directive"
export * from "./dirty.directive"
export * from "./ui-state"

const entries = [BusyDirective, DirtyDirective, DisabledDirective, ReadonlyDirective]

@NgModule({
    imports: entries,
    exports: entries
})
export class UiStateModule { }
