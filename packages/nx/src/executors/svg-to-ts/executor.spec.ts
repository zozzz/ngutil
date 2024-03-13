import * as path from "path"

import executor from "./executor"

const SELF_DIR = __dirname
// const ASSETS = path.join(SELF_DIR, "test-cases")

describe("SvgToTs Executor", () => {
    it("single file", async () => {
        const output = await executor(
            {
                prefix: "nu",
                sets: [
                    {
                        files: ["thermometer.svg"],
                        output: "generated/single.ts"
                    }
                ]
            },
            { root: path.join(SELF_DIR, "test-assets") } as any
        )
        expect(output.success).toBe(true)
    })

    it("glob", async () => {
        const output = await executor(
            {
                prefix: "nu",
                sets: [
                    {
                        files: ["*.svg"],
                        output: "generated/glob.ts"
                    }
                ]
            },
            { root: path.join(SELF_DIR, "test-assets") } as any
        )
        expect(output.success).toBe(true)
    })

    it("addClass", async () => {
        const output = await executor(
            {
                prefix: "nu",
                sets: [
                    {
                        files: ["thermometer.svg"],
                        output: "generated/add-class.ts",
                        overrides: [{ addClass: ["thermometer"] }]
                    }
                ]
            },
            { root: path.join(SELF_DIR, "test-assets") } as any
        )
        expect(output.success).toBe(true)
    })

    it("attributes", async () => {
        const output = await executor(
            {
                prefix: "nu",
                sets: [
                    {
                        files: ["thermometer.svg"],
                        output: "generated/attributes.ts",
                        overrides: [{ attributes: { "svg:almafa-x": "currentColor", "svg:fill-rule": null } }]
                    }
                ]
            },
            { root: path.join(SELF_DIR, "test-assets") } as any
        )
        expect(output.success).toBe(true)
    })

    it("empty", async () => {
        const output = await executor(
            {
                prefix: "nu",
                sets: [
                    {
                        files: ["aaaaaaaaaaaaaaaaaa.svg"],
                        output: "generated/empty.ts"
                    }
                ]
            },
            { root: path.join(SELF_DIR, "test-assets") } as any
        )
        expect(output.success).toBe(true)
    })

    describe("preset", () => {
        it("icon", async () => {
            const output = await executor(
                {
                    prefix: "nu",
                    sets: [
                        {
                            files: ["*.svg"],
                            output: "generated/preset-icon.ts",
                            preset: "icon"
                        }
                    ]
                },
                { root: path.join(SELF_DIR, "test-assets") } as any
            )
            expect(output.success).toBe(true)
        })
    })
})
