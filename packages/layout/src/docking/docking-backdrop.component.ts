import { Component, HostBinding } from "@angular/core"

@Component({
    standalone: true,
    selector: "nu-docking-backdrop",
    styleUrl: "./docking-backdrop.component.scss",
    template: ``
})
export class DockingBackdropComponent {
    @HostBinding("[attr.state]")
    state: "visible" | "hidden" = "hidden"
}
