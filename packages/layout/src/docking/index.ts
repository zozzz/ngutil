import { NgModule } from "@angular/core"

import { DockingContentComponent } from "./docking-content.component"
import { DockingLayoutComponent } from "./docking-layout.component"
import { DockingPanelComponent } from "./docking-panel.component"

export { DockingLayoutComponent, DockingPanelComponent, DockingContentComponent }

const members = [DockingLayoutComponent, DockingPanelComponent, DockingContentComponent]

@NgModule({
    imports: members,
    exports: members
})
export class NuDockingLayout {}
