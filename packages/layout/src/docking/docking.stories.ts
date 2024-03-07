/* eslint-disable max-len */
import { Meta, moduleMetadata, StoryObj } from "@storybook/angular/"

import { Component } from "@angular/core"

import { NuDockingLayout } from "./index"

@Component({
    standalone: true,
    selector: "story-docking",
    imports: [NuDockingLayout],
    template: `
        <nu-docking style="width:100vw;height:100vh;">
            <nu-docking-panel
                position="left"
                fullSize="200"
                miniSize="48"
                mode="rigid"
                state="hidden"
                #leftPanel="nuDockingPanel"
                style="background:cyan;opacity:0.5"
                backdrop
            >
                <div style="width:var(--docking-panel-full-size);background:#CC3300;padding-top:100px;">FULL SIZE</div>
            </nu-docking-panel>

            <nu-docking-panel
                position="top"
                fullSize="auto"
                mode="rigid"
                state="full"
                #topPanel="nuDockingPanel"
                style="background:magenta;opacity:0.5"
            >
                <div id="header-item">Header item</div>
                @for (item of headerExtra; track item; let idx = $index) {
                    <div>{{ idx }} - {{ item }}</div>
                }
            </nu-docking-panel>

            <nu-docking-panel
                position="right"
                fullSize="100"
                miniSize="50"
                #rightPanel="nuDockingPanel"
                style="background:yellow;opacity:0.5"
            >
                <div style="flex:1 1 1%;border: 1px solid red">B1</div>
                <div style="flex:2 1 1%;border: 1px solid green">B2</div>
                <div style="flex:1 1 1%;border: 1px solid blue">B3</div>
            </nu-docking-panel>

            <nu-docking-panel
                position="bottom"
                state="hidden"
                mode="over"
                fullSize="100"
                #bottomPanel="nuDockingPanel"
                style="background:black;opacity:0.5"
            >
            </nu-docking-panel>

            <nu-docking-content>
                <div style="background:#333;flex:1;overflow:auto;">
                    <div
                        style="
                            display: grid;
                            grid-template-columns: max-content max-content max-content;
                            grid-template-rows: repeat(4, max-content);
                            gap: 10px;
                            margin-bottom: 10px;"
                    >
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

                    <button (click)="headerAddItem()">TOP: ADD ITEM</button>
                    <button (click)="headerDelItem()">TOP: DEL ITEM</button>

                    @for (row of rows; track row) {
                        <div>{{ row }}</div>
                    }
                </div>
            </nu-docking-content>
        </nu-docking>
    `
})
class StoryDockingLayout {
    rows: number[] = Array(50)
        .fill(0)
        .map((v, i) => i)

    headerExtra: string[] = []

    headerAddItem() {
        this.headerExtra.push("Another Header Row")
    }

    headerDelItem() {
        this.headerExtra.splice(0, 1)
    }
}

export default {
    title: "Layout / DockingLayout",
    component: StoryDockingLayout,
    decorators: [moduleMetadata({ imports: [NuDockingLayout] })],
    parameters: {
        layout: "fullscreen",
        controls: { include: [] }
    },
    render: args => {
        return {
            props: {
                ...args
            },
            template: `<story-docking></story-docking>`
        }
    }
} as Meta

type Story = StoryObj<StoryDockingLayout>

// export const DockingLayout: StoryFn<Story> = args => {
//     let rows = ""
//     for (let i = 0; i < 100; i++) {
//         rows += `<div>row${i}</div>`
//     }

//     const template = `

//     `

//     return {
//         props: args,
//         template
//     }
// }

export const Simple: Story = {}
