/**
 * -------------------
 * | 1:1 | 1:2 | 1:3 |
 * -------------------
 * | 2:1 | 2:2 | 2:3 |
 * -------------------
 * | 3:1 | 3:2 | 3:3 |
 * -------------------
 *
 * const alias = {"left": "1:1-3:1", "right": "1:3-3:3", "top": "1:2", "bottom": "3:2"}
 *
 * <nu-docking>
 *      <ng-template nuDockingPanel="1:1-3:1"
 *          mode="overlay|embedded"
 *          state="opened|closed|minimized"
 *          #leftPanel="appDockedPanel"></ng-template>
 *      <ng-template #content></ng-template>
 * </nu-docking>
 */
import { AsyncPipe, NgStyle, NgTemplateOutlet } from "@angular/common"
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ContentChild,
    ContentChildren,
    ElementRef,
    Input,
    OnChanges,
    QueryList,
    SimpleChanges,
    TemplateRef,
    ViewChild
} from "@angular/core"

import { BehaviorSubject, combineLatest, map, merge, Observable, startWith, Subject, switchMap } from "rxjs"

import { Destructible } from "@ngutil/common"

import { DockingPanelOutletComponent } from "./docking-panel-outlet.component"
import { DockingPanelDirective } from "./docking-panel.directive"
import { DockingPanelChanges } from "./docking-panel.service"

const EMBEDDED_ZINDEX = 20
const OVERLAY_ZINDEX = EMBEDDED_ZINDEX * 2

interface PanelRefChanges {
    ref: PanelRef
    changes: DockingPanelChanges
}

class PanelRef {
    style: Partial<CSSStyleDeclaration> = {}
    readonly changes: Observable<PanelRefChanges>
    constructor(public readonly panel: DockingPanelDirective) {
        this.changes = panel.changes.pipe(
            map(changes => {
                return { ref: this, changes }
            })
        )
    }
}

@Component({
    selector: "nu-docking",
    standalone: true,
    imports: [DockingPanelOutletComponent, NgStyle, AsyncPipe, NgTemplateOutlet],
    template: `
        <div #content class="content">
            <ng-template [ngTemplateOutlet]="contentTpl"></ng-template>
        </div>

        @if (!contentOnly) {
            @for (ref of panels | async; track ref) {
                <nu-docking-panel-outlet [panel]="ref.panel" [ngStyle]="ref.style" />
            }
        }
    `,
    styleUrl: "./docking-layout.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DockingLayoutComponent extends Destructible implements AfterViewInit, OnChanges {
    @Input() contentOnly = false

    @ContentChild("content", { read: TemplateRef }) contentTpl!: TemplateRef<any>

    @ContentChildren(DockingPanelDirective) dockingPanels!: QueryList<DockingPanelDirective>

    @ViewChild("content", { read: ElementRef }) contentEl!: ElementRef<HTMLDivElement>

    readonly panels = new BehaviorSubject<PanelRef[]>([])

    #reflow = new Subject<void>()

    ngAfterViewInit(): void {
        this.d
            .sub(merge(this.dockingPanels.changes, this.#reflow))
            .pipe(
                startWith(null),
                map(() => this.dockingPanels.map(panel => new PanelRef(panel))),
                switchMap(refs => combineLatest(refs.map(ref => ref.changes))),
                map(changes => {
                    this.#layout(changes)
                    return changes.map(c => c.ref)
                })
            )
            .subscribe(this.panels)
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ("contentOnly" in changes) {
            this.#reflow.next()
        }
    }

    #layout(entries: PanelRefChanges[]) {
        let paddingTop = 0
        let paddingRight = 0
        let paddingBottom = 0
        let paddingLeft = 0

        if (!this.contentOnly) {
            let embeddedZIndex = EMBEDDED_ZINDEX
            let overlayZIndex = OVERLAY_ZINDEX
            const leftRight: PanelRefChanges[] = entries.filter(v =>
                ["left", "right"].includes(v.changes.position.side)
            )
            const topBottom: PanelRefChanges[] = entries.filter(v =>
                ["top", "bottom"].includes(v.changes.position.side)
            )

            for (const entry of entries) {
                const changes = entry.changes
                const ref = entry.ref

                if (changes.mode === "embedded") {
                    ref.style.zIndex = `${embeddedZIndex++}`
                } else if (changes.mode === "overlay") {
                    ref.style.zIndex = `${overlayZIndex++}`
                }
            }

            for (const entry of leftRight) {
                const changes = entry.changes
                const ref = entry.ref

                const padding =
                    changes.mode === "embedded"
                        ? changes.state === "full"
                            ? changes.fullSize
                            : changes.state === "mini"
                              ? changes.miniSize
                              : 0
                        : 0

                ref.style.top = "0"
                ref.style.bottom = "0"

                if (changes.position.side === "left") {
                    paddingLeft = Math.max(paddingLeft, padding)
                    ref.style.left = "0"
                    ref.style.right = ""
                } else {
                    paddingRight = Math.max(paddingRight, padding)
                    ref.style.right = "0"
                    ref.style.left = ""
                }
            }

            for (const entry of topBottom) {
                const changes = entry.changes
                const ref = entry.ref

                const padding =
                    changes.mode === "embedded"
                        ? changes.state === "full"
                            ? changes.fullSize
                            : changes.state === "mini"
                              ? changes.miniSize
                              : 0
                        : 0

                if (changes.mode === "embedded") {
                    ref.style.left = `${paddingLeft}px`
                    ref.style.right = `${paddingRight}px`
                } else {
                    ref.style.left = "0"
                    ref.style.right = "0"
                }

                if (changes.position.side === "top") {
                    paddingTop = Math.max(paddingTop, padding)
                    ref.style.top = "0"
                    ref.style.bottom = ""
                } else {
                    paddingBottom = Math.max(paddingBottom, padding)
                    ref.style.bottom = `0`
                    ref.style.top = ""
                }
            }
        }

        const cel = this.contentEl.nativeElement
        cel.style.padding = `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`
    }
}
