import { NgModule } from "@angular/core"

import { SlidingItemDirective } from "./sliding-item.directive"
import { SlidingComponent } from "./sliding.component"

export { SlidingItemDirective, SlidingComponent }

const members = [SlidingItemDirective, SlidingComponent]

@NgModule({
    imports: members,
    exports: members
})
export class NuSlidingLayout {}
