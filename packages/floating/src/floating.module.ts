import { NgModule } from "@angular/core"

import { FloatingService } from "./floating/floating.service"
import { LayerService, RootLayer } from "./layer/layer.service"

@NgModule({
    providers: [FloatingService, { provide: LayerService, useClass: RootLayer }]
})
export class NuFloating {}
