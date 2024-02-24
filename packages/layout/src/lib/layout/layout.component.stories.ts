import type { Meta, StoryObj } from "@storybook/angular"
import { expect } from "@storybook/jest"
import { within } from "@storybook/testing-library"

import { LayoutComponent } from "./layout.component"

const meta: Meta<LayoutComponent> = {
    component: LayoutComponent,
    title: "LayoutComponent"
}
export default meta
type Story = StoryObj<LayoutComponent>

export const Primary: Story = {
    args: {}
}

export const Heading: Story = {
    args: {},
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement)
        expect(canvas.getByText(/layout works!/gi)).toBeTruthy()
    }
}
