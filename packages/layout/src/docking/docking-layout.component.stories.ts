import { Meta, moduleMetadata, StoryFn, StoryObj } from "@storybook/angular/"

import { DockingLayoutComponent } from "./docking-layout.component"
import { NuDockingLayout } from "./index"

export default {
    title: "Shared / DockingLayout",
    component: DockingLayoutComponent,
    decorators: [moduleMetadata({ imports: [NuDockingLayout] })],
    parameters: {
        layout: "fullscreen",
        controls: { include: [] }
    }
} as Meta

type Story = StoryObj<DockingLayoutComponent & { content: string }>

export const DockingLayout: StoryFn<Story> = args => {
    let rows = ""
    for (let i = 0; i < 100; i++) {
        rows += `<div>row${i}</div>`
    }

    const template = `
        <nu-docking style="width:100vw;height:100vh;">
            <ng-template
                    nuDockingPanel="left"
                    fullSize="200"
                    miniSize="48"
                    #leftPanel="nuDockingPanel">
                <div style="width:100%;height:100%;background:cyan;opacity:0.5">
                    <div style="width:var(--docking-panel-full-size);background:#CC3300">FULL SIZE</div>
                </div>
            </ng-template>

            <ng-template
                    nuDockingPanel="top"
                    fullSize="100"
                    miniSize="10"
                    #topPanel="nuDockingPanel">
                <div style="width:100%;height:100%;background:magenta;opacity:0.5"></div>
            </ng-template>

            <ng-template
                    nuDockingPanel="right"
                    fullSize="100"
                    miniSize="50"
                    #rightPanel="nuDockingPanel">
                <div style="width:100%;height:100%;background:yellow;opacity:0.5"></div>
            </ng-template>

            <ng-template
                    nuDockingPanel="bottom"
                    state="invisible"
                    mode="overlay"
                    fullSize="100"
                    #bottomPanel="nuDockingPanel">
                <div style="width:100%;height:100%;background:black;opacity:0.5"></div>
            </ng-template>

            <ng-template #content>
                <div style="background:#333;flex:1">
                    <div style="
                            display: grid;
                            grid-template-columns: max-content max-content max-content;
                            grid-template-rows: repeat(4, max-content);
                            gap: 10px">
                        <button (click)="leftPanel.open()">LEFT: OPEN</button>
                        <button (click)="leftPanel.minimize()">LEFT: MIN</button>
                        <button (click)="leftPanel.close()">LEFT: CLOSE</button>

                        <button (click)="topPanel.open()">TOP: OPEN</button>
                        <button (click)="topPanel.minimize()">TOP: MIN</button>
                        <button (click)="topPanel.close()">TOP: CLOSE</button>

                        <button (click)="rightPanel.open()">RIGHT: OPEN</button>
                        <button (click)="rightPanel.minimize()">RIGHT: MIN</button>
                        <button (click)="rightPanel.close()">RIGHT: CLOSE</button>

                        <button (click)="bottomPanel.open()">BOTTOM: OPEN</button>
                        <button (click)="bottomPanel.minimize()">BOTTOM: MIN</button>
                        <button (click)="bottomPanel.close()">BOTTOM: CLOSE</button>
                    </div>

                    ${rows}
                </div>
            </ng-template>
        </nu-docking>
    `

    return {
        props: args,
        template
    }
}
