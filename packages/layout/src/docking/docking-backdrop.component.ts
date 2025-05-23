import { Component, input } from "@angular/core"

@Component({
    selector: "nu-docking-backdrop",
    host: {
        "[attr.state]": "visible() ? 'visible' : 'hidden'"
    },
    styleUrl: "./docking-backdrop.component.scss",
    template: ``
})
export class DockingBackdropComponent {
    readonly visible = input.required()
}
