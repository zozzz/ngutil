import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ContentChild,
    ContentChildren,
    ElementRef,
    inject,
    Input,
    OnChanges,
    QueryList,
    SimpleChanges,
    ViewChild
} from "@angular/core"

import { combineLatest, map, Observable, shareReplay, startWith, Subject, switchMap } from "rxjs"

import { Destructible, FastDOM } from "@ngutil/common"

import { DockingBackdropComponent } from "./docking-backdrop.component"
import { DockingContentComponent } from "./docking-content.component"
import { type DockingPanelChanges, DockingPanelComponent } from "./docking-panel.component"

type DockingVerticalPosition = "top" | "middle" | "bottom"
type DockingHorizontalPositon = "left" | "center" | "right"
type DockingPosition = `${DockingVerticalPosition}:${DockingHorizontalPositon}`
export type DockingRange =
    | DockingVerticalPosition
    | DockingHorizontalPositon
    | DockingPosition
    | `${DockingPosition}-${DockingPosition}`

const RIGID_ZINDEX = 100
const OVER_ZINDEX = RIGID_ZINDEX * 2
const BACKDROP_ZINDEX = 10000

type PanelsChanges = Array<{ panel: DockingPanelComponent; changes: DockingPanelChanges }>

@Component({
    selector: "nu-docking",
    standalone: true,
    imports: [DockingContentComponent, DockingBackdropComponent],
    template: `
        <ng-content select="nu-docking-panel"></ng-content>

        @if (!contentComponent) {
            <nu-docking-content>
                <ng-content></ng-content>
            </nu-docking-content>
        } @else {
            <ng-content select="nu-docking-content"></ng-content>
        }

        <nu-docking-backdrop #backdrop (click)="onHideBackdropPanel($event)" />
    `,
    styleUrl: "./docking-layout.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DockingLayoutComponent extends Destructible implements AfterViewInit, OnChanges {
    readonly #el = inject(ElementRef<HTMLElement>)

    @Input() contentOnly = false

    @ContentChild(DockingContentComponent) contentComponent?: DockingContentComponent
    @ViewChild("backdrop", { read: ElementRef, static: true })
    backdropEl?: ElementRef<HTMLElement>
    @ContentChildren(DockingPanelComponent) dockingPanels!: QueryList<DockingPanelComponent>

    // readonly panels = new BehaviorSubject<PanelRef[]>([])
    readonly panels!: Observable<Array<DockingPanelComponent>>

    #reflow = new Subject<void>()
    #backdropPanel: DockingPanelComponent | null = null

    ngAfterViewInit(): void {
        // eslint-disable-next-line prettier/prettier
        (this as { panels: Observable<Array<DockingPanelComponent>> }).panels = this.dockingPanels.changes.pipe(
            startWith(null),
            map(() => this.dockingPanels.toArray()),
            shareReplay(1)
        )

        this.d
            .sub(combineLatest({ panels: this.panels, reflow: this.#reflow.pipe(startWith(null)) }))
            .pipe(
                switchMap(({ panels }) =>
                    combineLatest(
                        panels.map(panel =>
                            panel.changes.pipe(
                                map(changes => {
                                    return { panel, changes }
                                })
                            )
                        )
                    )
                )
            )
            .subscribe(this.#layout.bind(this))
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ("contentOnly" in changes || "positionMode" in changes) {
            this.#reflow.next()
        }
    }

    #layout(entries: PanelsChanges) {
        let paddingTop = 0
        let paddingRight = 0
        let paddingBottom = 0
        let paddingLeft = 0
        let rigidZIndex = RIGID_ZINDEX
        let overZIndex = OVER_ZINDEX
        let backdropZIndex = -1

        this.#backdropPanel = null

        if (this.contentOnly) {
            // TODO:...
        } else {
            for (const entry of entries) {
                const panelState = entry.changes
                const panelSize =
                    panelState.state === "full"
                        ? panelState.fullSize.value
                        : panelState.state === "mini"
                          ? panelState.miniSize.value
                          : 0

                const isHorizontal = panelState.position.orient === "horizontal"
                const isRigid = panelState.mode === "rigid"

                let panelTop = null
                let panelRight = null
                let panelBottom = null
                let panelLeft = null

                if (isHorizontal) {
                    panelLeft = 0
                    panelRight = 0
                    if (panelState.position.cells[0].v === "top") {
                        if (isRigid) {
                            paddingTop = Math.max(paddingTop, panelSize)
                        }
                        panelTop = 0
                    } else if (panelState.position.cells[0].v === "bottom") {
                        if (isRigid) {
                            paddingBottom = Math.max(paddingBottom, panelSize)
                        }
                        panelBottom = 0
                    }
                } else {
                    panelTop = 0
                    panelBottom = 0

                    if (panelState.position.cells[0].h === "left") {
                        if (isRigid) {
                            paddingLeft = Math.max(paddingLeft, panelSize)
                        }
                        panelLeft = 0
                    } else if (panelState.position.cells[0].h === "right") {
                        if (isRigid) {
                            paddingRight = Math.max(paddingRight, panelSize)
                        }
                        panelRight = 0
                    }
                }

                let panelZIndex = isRigid ? (rigidZIndex += 2) : (overZIndex += 2)
                if (panelState.state !== "hidden" && entry.panel.backdrop) {
                    backdropZIndex = BACKDROP_ZINDEX
                    panelZIndex = backdropZIndex + 1
                    this.#backdropPanel = entry.panel
                }

                FastDOM.setStyle(entry.panel.el.nativeElement, {
                    "z-index": `${panelZIndex}`,
                    "--docking-panel-t": panelTop != null ? `${panelTop}px` : null,
                    "--docking-panel-r": panelRight != null ? `${panelRight}px` : null,
                    "--docking-panel-b": panelBottom != null ? `${panelBottom}px` : null,
                    "--docking-panel-l": panelLeft != null ? `${panelLeft}px` : null
                })
            }

            FastDOM.setStyle(this.#el.nativeElement, {
                "--docking-layout-top": `${paddingTop}px`,
                "--docking-layout-right": `${paddingRight}px`,
                "--docking-layout-bottom": `${paddingBottom}px`,
                "--docking-layout-left": `${paddingLeft}px`
            })

            if (this.backdropEl) {
                FastDOM.setAttributes(this.backdropEl.nativeElement, {
                    state: backdropZIndex < 0 ? "hidden" : "visible"
                })
                FastDOM.setStyle(this.backdropEl.nativeElement, { "z-index": `${backdropZIndex}` })
            }
        }
    }

    onHideBackdropPanel(event: Event) {
        event.preventDefault()
        if (this.#backdropPanel) {
            this.#backdropPanel.close()
        }
    }
}
