import { Provider } from "@angular/core"

import { FloatingService } from "./floating"
import { LAYER_CONTAINER_ZINDEX_START, LayerContainer, LayerService, RootLayer } from "./layer"

export * from "./floating"
export * from "./layer"

export interface ProvideFloatingOptions {
    zIndexStart?: number
}

const DEFAULTS: ProvideFloatingOptions = {
    zIndexStart: 10000
}

export function provideFloating(options: ProvideFloatingOptions = {}): Provider[] {
    const opts = { ...DEFAULTS, ...options }
    return [
        { provide: LAYER_CONTAINER_ZINDEX_START, useValue: opts.zIndexStart },
        { provide: LayerContainer, useClass: RootLayer },
        LayerService,
        FloatingService
    ]
}
