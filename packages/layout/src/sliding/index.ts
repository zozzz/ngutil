import { NgModule } from "@angular/core"

import { EndlessSlidingComponent } from "./endless-sliding.component"
import { SlidingItemDirective } from "./sliding-item.directive"
import { SlidingComponent } from "./sliding.component"

export { EndlessSlidingComponent, SlidingItemDirective, SlidingComponent }

const members = [EndlessSlidingComponent, SlidingItemDirective, SlidingComponent]

@NgModule({
    imports: members,
    exports: members
})
export class NuSlidingLayout { }
