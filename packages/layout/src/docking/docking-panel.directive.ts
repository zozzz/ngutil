import { Directive, Input, TemplateRef } from "@angular/core"

import {
    DockingPanelMode,
    DockingPanelPosition,
    DockingPanelPositionInput,
    DockingPanelService,
    DockingPanelState
} from "./docking-panel.service"

export interface TemplateContext {
    $implicit: DockingPanelDirective
}

@Directive({
    selector: "ng-template[nuDockingPanel]",
    standalone: true,
    exportAs: "nuDockingPanel",
    providers: [DockingPanelService]
})
export class DockingPanelDirective {
    @Input("nuDockingPanel")
    set positionInput(val: DockingPanelPositionInput) {
        if (this.position.value.side !== val) {
            this.position.next(new DockingPanelPosition(val))
        }
    }

    @Input("state")
    set stateInput(val: DockingPanelState) {
        if (this.state.value !== val) {
            this.state.next(val)
        }
    }

    @Input("mode")
    set modeInput(val: DockingPanelMode) {
        if (this.mode.value !== val) {
            this.mode.next(val)
        }
    }

    @Input("fullSize")
    set fullSizeInput(val: number | string) {
        const coerced = Number(val)
        if (this.fullSize.value !== coerced) {
            this.fullSize.next(coerced)
        }
    }

    @Input("miniSize")
    set miniSizeInput(val: number | string) {
        const coerced = Number(val)
        if (this.miniSize.value !== coerced) {
            this.miniSize.next(coerced)
        }
    }

    readonly position = this.svc.position
    readonly state = this.svc.state
    readonly mode = this.svc.mode
    readonly fullSize = this.svc.fullSize
    readonly miniSize = this.svc.miniSize
    readonly changes = this.svc.changes

    constructor(
        public readonly tpl: TemplateRef<TemplateContext>,
        public readonly svc: DockingPanelService
    ) {}

    get canMini() {
        return this.svc.canMini
    }

    open() {
        this.svc.open()
    }

    close() {
        this.svc.close()
    }

    minimize() {
        this.svc.minimize()
    }
}
