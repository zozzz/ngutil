/* eslint-disable max-len */
import { Meta, StoryFn, StoryObj } from "@storybook/angular/"

import { AsyncPipe } from "@angular/common"
import { Component, inject } from "@angular/core"

import { Focusable } from "./focusable.directive"

@Component({
    standalone: true,
    selector: "story-focusable",
    imports: [AsyncPipe],
    providers: [Focusable],
    host: {
        "[attr.tabindex]": "0"
    },
    styles: `
        :host {
            display: block;
            border: 1px solid red;
            padding: 4px;
            display: flex;
            flex-flow: column nowrap;
            align-items: stretch;
            min-width: 300px;
            box-sizing: border-box;
            margin: 16px;

            &:focus {
                outline: none;
            }

            pre {
                padding: 10px;
                cursor: pointer;
                margin: 0;
                user-select: none;

                &:hover {
                    background: rgba(200, 200, 200, 0.5);
                }
            }

            &[focused~="mouse"] pre {
                background: red;
            }

            &[focused~="keyboard"] pre {
                background: blue;
            }
        }
    `,
    template: `
        <pre>origin = {{ focus.origin | async }} - exact: {{ focus.exact | async }}</pre>
        <div><ng-content /></div>
    `
})
class FocusableComponent {
    focus = inject(Focusable)
}

export default {
    title: "Focus / Focusable",
    component: FocusableComponent
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
} as Meta<FocusableComponent>

type Story = StoryObj<FocusableComponent>

export const Basic: StoryFn<Story> = args => {
    const template = `
        <story-focusable></story-focusable>
        <story-focusable></story-focusable>
        <story-focusable></story-focusable>
    `

    return {
        props: args,
        template
    }
}
