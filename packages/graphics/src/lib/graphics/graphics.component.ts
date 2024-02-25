import { CommonModule } from "@angular/common"
import { Component } from "@angular/core"

@Component({
    selector: "nu-graphics",
    standalone: true,
    imports: [CommonModule],
    template: `<p>graphics works!</p>`,
    styleUrl: "./graphics.component.scss"
})
export class GraphicsComponent {}
