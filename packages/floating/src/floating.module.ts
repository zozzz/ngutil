import { NgModule } from "@angular/core"

import { FloatingService } from "./floating/floating.service"
import { RootLayer } from "./layer/layer.service"

@NgModule({
    providers: [FloatingService],
    imports: [RootLayer],
    exports: [RootLayer]
})
export class NuFloating {}
