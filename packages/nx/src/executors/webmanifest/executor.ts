import { favicons } from "favicons"
import * as fs from "fs/promises"
import * as path from "path"
import { rimraf } from "rimraf"

import { commit } from "../../util"
import { GenerateExecutorSchema } from "./schema"

export default async function runExecutor(options: GenerateExecutorSchema) {
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

    await generate(options)

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

async function generate(options: GenerateExecutorSchema) {
    const pckg = await readPackageJson(options.packageJson)
    const config = { ...options.manifest }

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
    // import * as _readPackageJson from "read-package-json"
    // return new Promise<{ [key: string]: any }>((resolve, reject) => {
    //     _readPackageJson(pth, console.error, false, (err, data) => {
    //         if (err) {
    //             reject(err)
    //         } else {
    //             resolve(data)
    //         }
    //     })
    // })
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
