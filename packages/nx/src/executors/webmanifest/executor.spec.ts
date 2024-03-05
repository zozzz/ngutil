// import { GenerateExecutorSchema } from "./schema"
// const options: GenerateExecutorSchema = {}
import * as fs from "fs"
import * as path from "path"

import executor from "./executor"

const SELF_DIR = __dirname
const ASSETS_DIR = path.join(SELF_DIR, "test-assets")
const OUTPUT_DIR = path.join(SELF_DIR, "..", "..", "..", "..", "..", "dist", ".webmanifest-test")

describe("Generate webmanifest", () => {
    it("can run", async () => {
        const iconPath = path.join(ASSETS_DIR, "icon.png")
        const inconContent = fs.readFileSync(iconPath)
        const indexHtml = path.join(ASSETS_DIR, "index.html")
        const indexContent = fs.readFileSync(indexHtml, { encoding: "utf-8" })
        const indexHtmlOutput = path.join(OUTPUT_DIR, "index.html")

        const output = await executor(
            {
                iconPath: iconPath,
                indexHtml: indexHtml,
                indexHtmlOutput: indexHtmlOutput,
                indexHtmlReplaceTag: "XYZ",
                outputPath: path.join(OUTPUT_DIR, "manifest"),
                packageJson: path.join(ASSETS_DIR, "package.json"),
                manifest: {
                    path: "assets/manifest",
                    appName: "TestApp",
                    appShortName: "Test applicaton",
                    theme_color: "import('test-assets/colors.json').Colors.Theme",
                    background: "import('test-assets/colors.json')['Colors'][\"Background\"]"
                },
                clean: true
            },
            { root: SELF_DIR } as any
        )

        expect(output.success).toStrictEqual(true)

        const indexContent2 = fs.readFileSync(indexHtml, { encoding: "utf-8" })
        expect(indexContent).toStrictEqual(indexContent2)

        const newIndexContent = fs.readFileSync(indexHtmlOutput)
        expect(indexContent).not.toStrictEqual(newIndexContent)

        const inconContent2 = fs.readFileSync(iconPath)
        expect(inconContent).toStrictEqual(inconContent2)
    })
})
