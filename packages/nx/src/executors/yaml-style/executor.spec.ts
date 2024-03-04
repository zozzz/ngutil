import * as fs from "fs"
import * as path from "path"

import executor from "./executor"

const SELF_DIR = __dirname
const TEST_CASES = path.join(SELF_DIR, "test-cases")

describe("YamlStyle Executor", () => {
    for (const entry of fs.readdirSync(TEST_CASES)) {
        const fullPath = path.join(TEST_CASES, entry)
        if (fs.statSync(fullPath).isDirectory()) {
            describe(entry, () => {
                beforeAll(async () => {
                    const output = await executor({ files: ["input.yml"] }, { root: fullPath } as any)
                    expect(output.success).toBe(true)
                })

                for (const expectedFile of fs.readdirSync(fullPath)) {
                    const baseName = path.basename(expectedFile)
                    const baseNmaeParts = baseName.split(".")
                    const extension = baseNmaeParts.pop()
                    const baseNameWithoutExt = baseNmaeParts.join(".")
                    if (baseNameWithoutExt === "expected") {
                        it(extension, () => {
                            const expectedContent = fs.readFileSync(path.join(fullPath, expectedFile), {
                                encoding: "utf-8"
                            })
                            const generatedContent = fs.readFileSync(path.join(fullPath, `input.${extension}`), {
                                encoding: "utf-8"
                            })
                            expect(generatedContent.trim()).toStrictEqual(expectedContent.trim())
                        })
                    }
                }
            })
        }
    }
})
