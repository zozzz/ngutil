/* eslint-disable max-len */
import { Meta, moduleMetadata, StoryObj } from "@storybook/angular"

import { JsonPipe } from "@angular/common"
import { Component, inject, signal } from "@angular/core"

import { BusyDirective } from "./busy.directive"
import { DisabledDirective } from "./disabled.directive"
import { ReadonlyDirective } from "./readonly.directive"
import { UiState } from "./ui-state"

@Component({
    standalone: true,
    selector: "gesture-test",
    imports: [BusyDirective, DisabledDirective, ReadonlyDirective, JsonPipe],
    providers: [UiState],
    styles: `
        :host {
            display: grid;
            grid-template-columns: max-content max-content max-content max-content;
            grid-template-rows: auto;
            row-gap: 14px;
            column-gap: 14px;

            button {
                all: unset;
                cursor: pointer;
                border: 1px solid #ccc;
                border-radius: 3px;
                padding: 5px 12px;
                text-transform: uppercase;
                font-weight: bold;
                font-size: 12px;
                line-height: 16px;
                text-align: center;
                color: #000000;
                font-family: sans-serif;

                &:hover {
                    background-color: #f5f5f5;
                }
            }

            div {
                font-family: monospace;
                white-space: pre;
            }
        }
    `,
    template: `
        <div>parent:</div>
        <button (click)="state.set('busy', true, 'loading')">true</button>
        <button (click)="state.set('busy', false, 'loading')">false</button>
        <div nuBusy nuDisabled nuReadonly>{{ state.is("busy") }} | {{ state.merged() | json }}</div>

        <div>busy:</div>
        <button (click)="busy.set(true)">true</button>
        <button (click)="busy.set(false)">false</button>
        <div [nuBusy]="busy()" #busyDirective="busy">
            {{ busyDirective.yes() }} | {{ busyDirective.state.merged() | json }}
        </div>

        <div>set parent busy:</div>
        <button (click)="busyDirective2.set(true, 'alma')">true</button>
        <button (click)="busyDirective2.set(false, 'alma')">false</button>
        <div nuBusyWhen="alma" #busyDirective2="busy">
            {{ busyDirective2.yes() }} | {{ busyDirective2.state.merged() | json }}
        </div>

        <!--<div>disabled:</div>
        <button>true</button>
        <button>false</button>
        <div nuDisabled #disabled="disabled">...</div>

        <div>readonly:</div>
        <button>true</button>
        <button>false</button>
        <div nuReadonly #readonly="readonly">...</div> -->
    `
})
class UiStateTest {
    readonly state = inject(UiState)
    readonly busy = signal(false)
}

export default {
    title: "UI State",
    component: UiStateTest,
    decorators: [moduleMetadata({ imports: [] })]
    // parameters: {
    //     layout: "fullscreen",
    //     controls: { include: [] }
    // },
    // render: (args: FocusableComponent) => {
    //     const content = args.content
    //     delete args.content
    //     return {
    //         props: {
    //             ...args
    //         },
    //         template: `<nu-story-slot ${argsToTemplate(args)}>${content || ""}</nu-story-slot>`
    //     }
    // }
} as Meta<UiStateTest>

type Story = StoryObj<UiStateTest>

export const All: Story = {}
