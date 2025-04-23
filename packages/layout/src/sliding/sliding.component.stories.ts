/* eslint-disable max-len */
import { Meta, moduleMetadata, StoryObj } from "@storybook/angular/"

import { Component, viewChild } from "@angular/core"
import { BrowserAnimationsModule } from "@angular/platform-browser/animations"

import { NuSlidingLayout, SlidingComponent } from "./index"

@Component({
    standalone: true,
    selector: "story-sliding",
    imports: [NuSlidingLayout],
    styles: [
        `
            .container {
                display: inline-flex;
                flex-direction: column;
                align-items: stretch;
                gap: 8px;
                border: 1px solid black;
                padding: 8px;
            }

            .buttons {
                display: flex;
                flex-direction: row;
                gap: 8px;
            }

            .tabs {
                border: 1px solid red;
            }

            .tab-conent {
                background-color: rgba(0, 0, 0, 0.1);
            }
        `
    ],
    template: `
        <div class="container">
            <div class="buttons">
                <button (click)="addItem()">Add item</button>
                <button (click)="delItem()">Del item</button>
                @for (item of items; track item; let index = $index) {
                    <button (click)="activate(index)">ITEM {{ item }}</button>
                }
            </div>

            <nu-sliding #tabs class="tabs" [lazy]="true">
                @for (item of items; track item; let index = $index) {
                    <ng-template nuSlidingItem (activated)="onActivate($event)">
                        <div class="tab-conent">
                            <div>Contetn of {{ item }}</div>
                            @for (row of [].constructor(index + 1); track item; let rowIdx = $index) {
                                <div>{{ rowIdx + 1 }}. row</div>
                            }
                        </div>
                    </ng-template>
                }
            </nu-sliding>
        </div>
    `
})
class StorySlidingLayout {
    readonly tabs = viewChild("tabs", { read: SlidingComponent })

    readonly items: number[] = [1, 2, 3]

    activate(idx: number) {
        this.tabs()?.preferred.set(idx)
    }

    addItem() {
        this.items.push(this.items.length + 1)
    }

    delItem() {
        this.items.pop()
    }

    onActivate(idx: number) {
        console.log("onActivate", idx)
    }
}

export default {
    title: "Layout / SlidingLayout",
    component: StorySlidingLayout,
    decorators: [moduleMetadata({ imports: [NuSlidingLayout, BrowserAnimationsModule] })],
    parameters: {
        layout: "fullscreen",
        controls: { include: [] }
    },
    render: args => {
        return {
            props: {
                ...args
            },
            template: `<story-sliding></story-sliding>`
        }
    }
} as Meta

type Story = StoryObj<StorySlidingLayout>

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
