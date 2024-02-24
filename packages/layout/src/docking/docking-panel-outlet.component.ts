import { NgTemplateOutlet } from "@angular/common"
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    inject,
    Injector,
    Input,
    OnChanges,
    OnDestroy,
    SimpleChanges
} from "@angular/core"

import { Subscription } from "rxjs"

import type { DockingPanelDirective } from "./docking-panel.directive"
import { DockingPanelChanges, DockingPanelService } from "./docking-panel.service"

@Component({
    selector: "nu-docking-panel-outlet",
    standalone: true,
    imports: [NgTemplateOutlet],
    template: `
        @if (injector) {
            <ng-template
                [ngTemplateOutlet]="panel.tpl"
                [ngTemplateOutletContext]="{ $implicit: panel }"
                [ngTemplateOutletInjector]="injector"
            />
        }
    `,
    styleUrl: "./docking-panel-outlet.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DockingPanelOutletComponent implements OnChanges, OnDestroy {
    #el = inject(ElementRef<HTMLElement>)
    #injector = inject(Injector)

    @Input()
    panel!: DockingPanelDirective

    injector?: Injector

    #panelChangesSub?: Subscription

    ngOnChanges(changes: SimpleChanges): void {
        if ("panel" in changes) {
            const panel = changes["panel"].currentValue as DockingPanelDirective
            this.#panelChangesSub?.unsubscribe()
            this.#panelChangesSub = panel.changes.subscribe(this.#onPanelChanges)
            this.injector = Injector.create({
                providers: [{ provide: DockingPanelService, useValue: panel.svc }],
                parent: this.#injector
            })
        }
    }

    ngOnDestroy(): void {
        this.#panelChangesSub?.unsubscribe()
    }

    #onPanelChanges = (changes: DockingPanelChanges) => {
        this.#updateAttr("orient", changes.position.orient)
        this.#updateAttr("state", changes.state)
        this.#updateAttr("mode", changes.mode)
        this.#updateStyle(changes)
    }

    #updateAttr(name: string, value: string | null | undefined) {
        if (value == null) {
            this.#el.nativeElement.removeAttribute(name)
        } else {
            this.#el.nativeElement.setAttribute(name, value)
        }
    }

    #updateStyle(changes: DockingPanelChanges) {
        const elStyle = this.#el.nativeElement.style
        let invisibleTranslate = "-100%"

        if (changes.position.side === "bottom" || changes.position.side === "right") {
            invisibleTranslate = "100%"
        }

        elStyle.setProperty("--docking-panel-full-size", `${changes.fullSize}px`)
        elStyle.setProperty("--docking-panel-mini-size", `${changes.miniSize}px`)
        elStyle.setProperty("--docking-panel-visible-translate", "0%")
        elStyle.setProperty("--docking-panel-invisible-translate", invisibleTranslate)
    }
}
