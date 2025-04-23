import { Component } from "@angular/core"

export const enum ItemAnimationState {
    LeftIn = "left-in",
    LeftOut = "left-out",
    RightIn = "right-in",
    RightOut = "right-out",
    FastOut = "fast-out",
    FastIn = "fast-in"
}

@Component({
    selector: "nu-sliding-item",
    styleUrl: "./sliding-item.component.scss",
    template: `<ng-content />`
})
export class SlidingItemComponent { }
