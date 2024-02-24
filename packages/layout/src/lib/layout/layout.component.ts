import { CommonModule } from "@angular/common"
import { Component } from "@angular/core"

@Component({
    selector: "nu-layout",
    standalone: true,
    imports: [CommonModule],
    template: `<p>layout works!</p>`,
    styleUrl: "./layout.component.scss"
})
export class LayoutComponent {}
