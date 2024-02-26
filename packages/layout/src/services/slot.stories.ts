/* eslint-disable max-len */
import { Meta, moduleMetadata, StoryFn, StoryObj } from "@storybook/angular/"

import { Component, Directive, inject, Injectable, Input } from "@angular/core"

import { SlotDirective, SlotOutletDirective, SlotsService } from "./slots.service"

type StorySlots = "top" | "right" | "bottom" | "left"

@Injectable()
class StorySlotsService extends SlotsService<StorySlots> {}

@Directive({
    standalone: true,
    selector: "ng-template[storySlot]",
    inputs: [{ name: "slot", alias: "storySlot" }]
})
class StorySlot extends SlotDirective<StorySlots> {
    protected override slotSvc: SlotsService<StorySlots> = inject(StorySlotsService)
}

@Directive({
    standalone: true,
    selector: "ng-template[storySlotOutlet]",
    inputs: [{ name: "slot", alias: "storySlotOutlet" }]
})
class StorySlotOutlet extends SlotOutletDirective<StorySlots> {
    protected override slotSvc: SlotsService<StorySlots> = inject(StorySlotsService)
}

@Component({
    standalone: true,
    selector: "nu-story-slot",
    imports: [StorySlotOutlet],
    providers: [StorySlotsService],
    styles: `
        :host {
            display: block;
            border: 1px solid red;
            padding: 16px;
            display: flex;
            flex-flow: column nowrap;
            align-items: stretch;
            width: 500px;
            box-sizing: border-box;
        }
    `,
    template: `
        <div>
            <div>{{ title }}</div>
        </div>

        <!-- <div class="unexpected"><ng-content></ng-content></div> -->

        <div class="top">
            <ng-template storySlotOutlet="top"></ng-template>
        </div>

        <div class="bottom">
            <ng-template storySlotOutlet="bottom"></ng-template>
        </div>
    `
})
class StorySlotsComponent {
    @Input()
    title: string = ""
}

type _StorySlotsComponent = StorySlotsComponent & { content?: string }

export default {
    title: "Services / Slots",
    component: StorySlotsComponent,
    decorators: [moduleMetadata({ imports: [StorySlot] })]
    // parameters: {
    //     layout: "fullscreen",
    //     controls: { include: [] }
    // },
    // render: (args: _StorySlotsComponent) => {
    //     const content = args.content
    //     delete args.content
    //     return {
    //         props: {
    //             ...args
    //         },
    //         template: `<nu-story-slot ${argsToTemplate(args)}>${content || ""}</nu-story-slot>`
    //     }
    // }
} as Meta<_StorySlotsComponent>

type Story = StoryObj<_StorySlotsComponent & { content: string }>

export const Basic: StoryFn<Story> = args => {
    const template = `
        <nu-story-slot title="outer">

            <ng-template storySlot="top">
                <nu-story-slot title="inner">
                    <ng-template storySlot="bottom:10"><div>INNER/BOTTOM:10</div></ng-template>
                </nu-story-slot>
            </ng-template>

            <ng-template storySlot="top:1 as topFirst"><div>OUTER/TOP:1 X</div></ng-template>
            <ng-template storySlot="top:1 as topFirst"><div>OUTER/TOP:1 Y</div></ng-template>
            <ng-template storySlot="bottom"><div>OUTER/BOTTOM:LAST</div></ng-template>
            <ng-template storySlot="bottom:10"><div>OUTER/BOTTOM:10</div></ng-template>
            <ng-template storySlot="top"><div>OUTER/TOP:LAST</div></ng-template>
            <ng-template storySlot="bottom:1"><div>OUTER/BOTTOM:1</div></ng-template>

            @if (o1Visible) {
                <ng-template storySlot="top:1 as topFirst"><div>OUTER/TOP:1 Z</div></ng-template>
            }

            @if (o2Visible) {
                <ng-template storySlot="bottom:1"><div>OUTER/BOTTOM/OPTIONAL:1</div></ng-template>
            }

            <ng-template storySlot="bottom">
                <button (click)="o1Visible=!o1Visible">OPTIONAL 1</button>
                <button (click)="o2Visible=!o2Visible">OPTIONAL 2</button>
            </ng-template>
        </nu-story-slot>
    `

    return {
        props: args,
        template
    }
}
