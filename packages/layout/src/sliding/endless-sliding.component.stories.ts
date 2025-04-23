/* eslint-disable max-len */
import { Meta, moduleMetadata, StoryObj } from "@storybook/angular/"

import { Component, viewChild } from "@angular/core"
import { BrowserAnimationsModule } from "@angular/platform-browser/animations"

import { EndlessSlidingComponent } from "./index"

@Component({
    selector: "story-endless-sliding",
    imports: [EndlessSlidingComponent],
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
                <button (click)="unshiftItem()">UNSHIFT</button>
                <button (click)="pushItem()">PUSH</button>
            </div>

            <nu-endless-sliding #sliding class="tabs">
                <ng-template #item let-item> Content: {{ item }} </ng-template>
            </nu-endless-sliding>
        </div>
    `
})
class StoryEndlessSlidingLayout {
    readonly sliding = viewChild.required("sliding", { read: EndlessSlidingComponent })
    #counter = 0

    unshiftItem() {
        this.sliding().unshift(++this.#counter)
    }

    pushItem() {
        this.sliding().push(++this.#counter)
    }
}

export default {
    title: "Layout / EndlessSlidingLayout",
    component: StoryEndlessSlidingLayout,
    decorators: [moduleMetadata({ imports: [BrowserAnimationsModule] })],
    parameters: {
        layout: "fullscreen",
        controls: { include: [] }
    },
    render: args => {
        return {
            props: {
                ...args
            },
            template: `<story-endless-sliding></story-endless-sliding>`
        }
    }
} as Meta

type Story = StoryObj<StoryEndlessSlidingLayout>

export const Simple: Story = {}
