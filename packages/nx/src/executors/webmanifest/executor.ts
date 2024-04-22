import { type ExecutorContext } from "@nx/devkit"
import { favicons } from "favicons"
import * as fs from "fs/promises"
import { isPlainObject } from "lodash"
import * as path from "path"
import { rimraf } from "rimraf"

import { commit, importValue } from "../../util"
import { GenerateExecutorSchema } from "./schema"

export default async function runExecutor(options: GenerateExecutorSchema, context: ExecutorContext) {
    options.iconPath = path.resolve(withDefault(options, "iconPath", null, true))
    options.indexHtml = path.resolve(withDefault(options, "indexHtml", null, false))
    options.indexHtmlOutput = path.resolve(withDefault(options, "indexHtmlOutput", options.indexHtml, true))
    options.indexHtmlReplaceTag = withDefault(options, "indexHtmlReplaceTag", "WEBMANIFEST", true)
    options.outputPath = path.resolve(withDefault(options, "outputPath", null, true))
    options.packageJson = path.resolve(withDefault(options, "packageJson", null, true))
    options.manifest = withDefault(options, "manifest", null, true)
    options.commitMessage = withDefault(options, "commitMessage", null, false)
    options.noCommit = withDefault(options, "noCommit", false, false)
    options.clean = withDefault(options, "clean", false, false)

    if (options.clean) {
        await rimraf(options.outputPath)
    }

    await generate(options, context)

    if (options.commitMessage && options.noCommit !== true) {
        const cpaths = [options.outputPath]
        if (options.indexHtmlOutput) {
            cpaths.push(options.indexHtmlOutput)
        }
        await commit(options.commitMessage, cpaths)
    }

    return {
        success: true
    }
}

async function generate(options: GenerateExecutorSchema, context: ExecutorContext) {
    const pckg = await readPackageJson(options.packageJson)
    const config = await substManifest(options.manifest, context.root)

    if (!config.version) {
        config.version = pckg.version
    }
    if (!config.appName) {
        config.version = pckg.name
    }
    if (!config.appDescription) {
        config.appDescription = pckg.description
    }
    if (!config.developerName && pckg.author) {
        config.developerName = pckg.author.name
    }
    if (!config.developerURL && pckg.author) {
        config.developerURL = pckg.author.url
    }

    const generated = await favicons(options.iconPath, config)

    const dest = options.outputPath
    await fs.mkdir(dest, { recursive: true })

    await Promise.all(generated.images.map(image => fs.writeFile(path.join(dest, image.name), image.contents)))
    await Promise.all(generated.files.map(files => fs.writeFile(path.join(dest, files.name), files.contents)))

    if (options.indexHtml && options.indexHtmlReplaceTag) {
        let htmlContent = await fs.readFile(options.indexHtml, { encoding: "utf-8" })
        const re = new RegExp(
            `<!-- ${options.indexHtmlReplaceTag}:BEGIN -->(.|\\r|\\n)*?<!-- ${options.indexHtmlReplaceTag}:END -->`,
            "g"
        )
        const detectIdent = new RegExp(`^(\\s*)<!-- ${options.indexHtmlReplaceTag}:BEGIN -->`, "m")
        const match = htmlContent.match(detectIdent)
        const ident = match[1]

        htmlContent = htmlContent.replace(
            re,
            // eslint-disable-next-line max-len
            `<!-- ${options.indexHtmlReplaceTag}:BEGIN -->\n${ident}${generated.html.join(`\n${ident}`)}\n${ident}<!-- ${options.indexHtmlReplaceTag}:END -->`
        )
        await fs.writeFile(options.indexHtmlOutput, htmlContent)
    }
}

async function readPackageJson(pth: string) {
    return await import(pth)
}

function withDefault<T extends GenerateExecutorSchema, K extends keyof T>(
    options: GenerateExecutorSchema,
    key: K,
    def: any,
    required: boolean
): T[K] {
    if (options[key as any] == null) {
        if (def == null && required) {
            throw new Error(`Missing '${key as any}' option`)
        }
        return def
    } else {
        return options[key as any]
    }
}

async function substManifest(manifest: any, root: string): Promise<any> {
    if (isPlainObject(manifest)) {
        const res = {}
        for (const [k, v] of Object.entries(manifest)) {
            res[k] = await substManifest(v, root)
        }
        return res
    } else if (Array.isArray(manifest)) {
        return manifest.map(async v => await substManifest(v, root))
    } else {
        return importValue(manifest, root)
    }
}
