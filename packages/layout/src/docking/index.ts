import { NgModule } from "@angular/core"

import { DockingLayoutComponent } from "./docking-layout.component"
import { DockingPanelDirective } from "./docking-panel.directive"
import { DockingPanelChanges, DockingPanelMode, DockingPanelPosition, DockingPanelState } from "./docking-panel.service"

export {
    DockingLayoutComponent,
    DockingPanelDirective,
    DockingPanelMode,
    DockingPanelPosition,
    DockingPanelState,
    DockingPanelChanges
}

const members = [DockingLayoutComponent, DockingPanelDirective]

@NgModule({
    imports: members,
    exports: members
})
export class NuDockingLayout {}
