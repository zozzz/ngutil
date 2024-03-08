import { type ExecutorContext } from "@nx/devkit"
import * as fs from "fs/promises"
import { globIterate } from "glob"
import * as path from "path"
import { optimize } from "svgo"

import { camelCase, pascalCase } from "../../util"
import { SvgToTsExecutorSchema } from "./schema"

type Sets = Array<SvgToTsExecutorSchema["sets"][number]>
type Overrides = SvgToTsExecutorSchema["sets"][number]["overrides"]

export default async function runExecutor(options: SvgToTsExecutorSchema, context: ExecutorContext) {
    const grouped = groupByOutput(options, context)

    for (const [output, group] of Object.entries(grouped)) {
        await convertGroup(options.prefix, output, group, context)
    }

    return {
        success: true
    }
}

function groupByOutput(options: SvgToTsExecutorSchema, context: ExecutorContext) {
    const byOutput: { [key: string]: Sets } = {}

    for (const set of options.sets) {
        const out = path.join(context.root, set.output)
        set.output = out
        let grouped = byOutput[out]
        if (grouped == null) {
            grouped = byOutput[out] = []
        }
        grouped.push(set)
    }

    return byOutput
}

async function convertGroup(prefix: string | undefined, output: string, group: Sets, context: ExecutorContext) {
    const svgs: { [key: string]: string } = {}

    for (const set of group) {
        for await (const file of setFiles(set, context)) {
            const name = prefix == null ? file.name : `${prefix}-${file.name}`
            const tsName = camelCase(name)
            const content = await convertSvg(file.file, set.overrides)
            svgs[tsName] = content.data
        }
    }

    const tsContent = [`/* eslint-disable */`]
    const keys = Object.keys(svgs).sort((a, b) => a.localeCompare(b))

    for (const k of keys) {
        const svg = svgs[k].replace("/`/g", "\\`")
        tsContent.push(`export const ${k} = \`${svg}\``)
    }

    const typeName = pascalCase(`${prefix ? `${prefix}-` : ""}iconName`)
    tsContent.push(`export type ${typeName} = ${keys.map(k => `"${k}"`).join(" | ")}`)

    await fs.mkdir(path.dirname(output), { recursive: true })
    await fs.writeFile(output, tsContent.join("\n"), { encoding: "utf-8" })
}

async function* setFiles(set: SvgToTsExecutorSchema["sets"][number], context: ExecutorContext) {
    for (const f of set.files) {
        if (typeof f === "string") {
            for await (const file of globIterate(f, { root: context.root, cwd: context.root })) {
                const baseName = path.basename(file)
                const parts = baseName.split(".")
                parts.pop()
                yield { name: parts.join("."), file: path.join(context.root, file) }
            }
        } else {
            yield { name: f.name, file: path.join(context.root, f.file) }
        }
    }
}

async function convertSvg(file: string, overrides: Overrides) {
    let overridePlugins = []
    if (overrides) {
        for (const override of overrides) {
            for (const [k, v] of Object.entries(override)) {
                const o = OVERRIDES[k](v)
                if (Array.isArray(o)) {
                    overridePlugins = overridePlugins.concat(o)
                } else {
                    overridePlugins.push(o)
                }
            }
        }
    }

    const content = await fs.readFile(file, { encoding: "utf-8" })
    return optimize(content, {
        path: file,
        multipass: true,
        js2svg: {
            pretty: false,
            useShortTags: true
        },
        plugins: [
            "cleanupAttrs",
            "cleanupEnableBackground",
            "cleanupIds",
            "collapseGroups",
            "convertColors",
            "convertPathData",
            "convertShapeToPath",
            "convertStyleToAttrs",
            "inlineStyles",
            "mergePaths",
            "mergeStyles",
            "minifyStyles",
            "removeComments",
            "removeDesc",
            "removeDimensions",
            "removeDoctype",
            "removeEditorsNSData",
            "removeEmptyAttrs",
            "removeEmptyContainers",
            "removeEmptyText",
            "removeMetadata",
            "removeScriptElement",
            // TODO: maybe not safe
            "removeStyleElement",
            "removeTitle",
            "removeUnusedNS",
            "removeUselessDefs",
            "removeUselessStrokeAndFill",
            "removeXMLProcInst",
            "removeXMLNS",
            "reusePaths",
            "sortAttrs",
            "sortDefsChildren",
            ...overridePlugins
        ]
    })
}

function addClass(classNames: string[]) {
    return {
        name: "addClass",
        fn: () => {
            return {
                root: {
                    enter: node => {
                        const svg = node.children[0]
                        if (!svg.attributes) {
                            svg.attributes = {}
                        }

                        if (!svg.attributes["class"]) {
                            svg.attributes["class"] = classNames.join(" ")
                        } else {
                            const cn = svg.attributes["class"].split(/\s+/)
                            for (const ncn of classNames) {
                                if (!cn.includes(ncn)) {
                                    cn.push(ncn)
                                }
                            }
                            svg.attributes["class"] = cn.join(" ")
                        }
                    }
                }
            }
        }
    }
}

function attributes(attrs: { [key: string]: string | null | undefined }) {
    return {
        name: "attributes",
        fn: () => {
            return {
                element: {
                    enter: node => {
                        for (const [pattern, value] of Object.entries(attrs)) {
                            if (pattern.includes("*")) {
                                if (value != null) {
                                    throw new Error(`Can't set multiple attributes into same value ${pattern}`)
                                }
                            }

                            const parts = pattern.split(":")
                            if (parts.length > 2) {
                                throw new Error(`Too many separator in attribute pattern: ${pattern}`)
                            } else if (parts.length === 1) {
                                parts.splice(0, 0, node.name)
                            }

                            if (parts[0] === "*") {
                                if (parts[1] === "*") {
                                    throw new Error(`Too many wildcards in attribute pattern: ${pattern}`)
                                }

                                if (value == null) {
                                    if (node.attributes) {
                                        delete node.attributes[parts[1]]
                                    }
                                } else {
                                    if (!node.attributes) {
                                        node.attributes = {}
                                    }
                                    node.attributes[parts[1]] = value
                                }
                            } else if (parts[0] === node.name) {
                                if (parts[1] === "*") {
                                    if (value == null) {
                                        node.attributes = {}
                                        continue
                                    } else {
                                        throw new Error(`Can't set multiple attributes: ${pattern}`)
                                    }
                                }

                                if (value == null) {
                                    delete node.attributes[parts[1]]
                                } else {
                                    node.attributes[parts[1]] = value
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

const OVERRIDES = { addClass, attributes }
