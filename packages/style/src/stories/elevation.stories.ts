// import { action } from "@storybook/addon-actions"
import type { Meta, StoryObj } from "@storybook/angular"

type ElevationOptions = { elevation: number }

const meta: Meta<ElevationOptions> = {
    title: "Elevation",
    // component: TaskComponent,
    // tags: ["autodocs"],
    render: (args: ElevationOptions) => {
        return {
            props: {
                ...args
            },
            template: `<div
                elevation="${args.elevation}"
                style="padding:16px; border-radius: 3px;margin:40px;">
                    Elevation ${args.elevation}
                </div>`
        }
    }
}

export default meta
type Story = StoryObj<ElevationOptions>

export const Default: Story = {
    args: {
        elevation: 5
    }
}
