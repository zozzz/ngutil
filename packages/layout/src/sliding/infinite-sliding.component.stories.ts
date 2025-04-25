/* eslint-disable max-len */
import { Meta, moduleMetadata, StoryObj } from "@storybook/angular"

import { Component, viewChild } from "@angular/core"
import { BrowserAnimationsModule } from "@angular/platform-browser/animations"

import { InfiniteSlideDirective, InfiniteSlidingComponent } from "./index"

@Component({
    selector: "story-infinite-sliding",
    imports: [InfiniteSlidingComponent, InfiniteSlideDirective],
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
                <button (click)="updateCurrent()">UPDATE</button>
            </div>

            <nu-infinite-sliding #sliding class="tabs">
                <ng-template nuInfiniteSlide let-item> Content: {{ item }} </ng-template>
            </nu-infinite-sliding>
        </div>
    `
})
class StoryInfiniteSlidingLayout {
    readonly sliding = viewChild.required("sliding", { read: InfiniteSlidingComponent })
    #counter = 0

    unshiftItem() {
        this.sliding().unshift(++this.#counter)
    }

    pushItem() {
        this.sliding().push(++this.#counter)
    }

    updateCurrent() {
        this.sliding().update(++this.#counter)
    }
}

export default {
    title: "Layout / InfiniteSlidingLayout",
    component: StoryInfiniteSlidingLayout,
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
            template: `<story-infinite-sliding></story-infinite-sliding>`
        }
    }
} as Meta

type Story = StoryObj<StoryInfiniteSlidingLayout>

export const Simple: Story = {}
