import { type ExecutorContext } from "@nx/devkit"
import * as fs from "fs/promises"
import { globIterate } from "glob"
import { isPlainObject } from "lodash"
import * as path from "path"
import { parse } from "yaml"

import { Converter, Converters } from "./converter/abstract"
import { convertToJson, JsonOptions } from "./converter/json"
import { convertToScss, ScssOptions } from "./converter/scss"
import { convertToTs, TypescriptOptions } from "./converter/typescript"
import { YamlStyleExecutorSchema } from "./schema"

export const CONVERTERS: Converters = {
    ts: {
        options: TypescriptOptions,
        convert: convertToTs,
        ext: ".ts"
    },
    scss: {
        options: ScssOptions,
        convert: convertToScss,
        ext: ".scss"
    },
    json: {
        options: JsonOptions,
        convert: convertToJson,
        ext: ".json"
    }
}

// eslint-disable-next-line max-len
// XXX: if i want ot watch file, i need a generator https://github.com/nrwl/nx/blob/master/packages/rollup/src/executors/rollup/rollup.impl.ts

export default async function runExecutor(options: YamlStyleExecutorSchema, _context: ExecutorContext) {
    for (const file of options.files) {
        for await (const entry of globIterate(file, { cwd: _context.root, root: _context.root })) {
            const absPath = path.join(_context.root, entry)
            await convertFile(absPath)
        }
    }

    return { success: true }
}

async function convertFile(file: string) {
    const stats = await fs.stat(file)
    if (!stats.isFile()) {
        throw new Error(`This is not a file: '${file}'`)
    }

    const fileContent = await fs.readFile(file, { encoding: "utf-8" })
    const parsedFile = parse(fileContent)

    if (!parsedFile.meta) {
        throw new Error(`Missing meta information form file: ${file}`)
    }

    if (!parsedFile.content) {
        throw new Error(`Missing content information form file: ${file}`)
    }

    const meta = parsedFile.meta
    const content = parsedFile.content

    if (!isPlainObject(content)) {
        throw new Error("Content must ba a dictionary")
    }

    for (const [k, v] of Object.entries(meta)) {
        if (!(k in CONVERTERS)) {
            throw new Error(`Invalid converter: ${k}`)
        }

        const converter = CONVERTERS[k as any] as Converter
        const options = new converter.options((v || {}) as any)

        const result = await converter.convert(options, content)
        const ext = path.extname(file)
        const filename = `${options.filename ? options.filename : path.basename(file, ext)}${converter.ext}`
        const outFile = path.join(path.dirname(file), filename)
        await fs.writeFile(outFile, result)
    }
}
