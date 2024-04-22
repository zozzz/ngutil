import { isPlainObject } from "lodash"

import { kebabCase } from "../../../util"
import { CommonOptions, ConvertData, ConverterOptions } from "./abstract"
import { Literal } from "./literal"

export type ScssType = "flatten" | "map"
type Literals = Array<Literal>
type Flattened = { path: string[]; value: Literal }
// export type ScssType = `placeholder ${_ScssType}` | `${_ScssType} placeholder` | _ScssType

export class ScssOptions extends CommonOptions {
    /**
     * @default "map"
     */
    type?: ScssType

    /**
     * If this value is provided, the converter creates placeholder selectors
     *
     * ```sass
     * %<path> {
     *   /// comment
     *   <placeholderProperty>: value;
     * }
     * ```
     *
     */
    placeholderProperty?: string

    constructor(options: ConverterOptions) {
        super(options)

        if (options.type == null) {
            this.type = "flatten"
        } else {
            this.type = options.type
        }
    }
}

export async function convertToScss(options: ScssOptions, data: ConvertData) {
    const header = `/* ! AUTO GENERATED DO NOT EDIT ! */\n\n`

    switch (options.type) {
        case "flatten":
            return header + flattenConverter(options, data) + "\n"
        case "map":
            return header + mapConverter(options, data) + "\n"
        default:
            throw new Error(`Not supported type value: ${options.type}`)
    }
}

/**
 * /// optional comment
 * $<path>: value;
 */
function flattenConverter(options: ScssOptions, data: ConvertData) {
    return flatten(data)
        .map(value => {
            const varName = "$" + value.path.map(kebabCase).join("-")
            const varValue = literalValue(value.value)
            const comment = value.value.comment ? `/// ${value.value.comment}\n` : ""
            return `${comment}${varName}: ${varValue} !default;`
        })
        .join("\n")
}

/**
 * $<path[0]>: (
 *   "<path[1]>": value,
 * );
 */
function mapConverter(options: ScssOptions, data: ConvertData) {
    const mod = new ScssModule()
    _mapConverter(options, data, [], mod, mod)
    const result = []
    mod.render(result, 0)
    return result.join("").trim()
}

function _mapConverter(options: ScssOptions, data: any, path: string[], parent: ScssElement, mod: ScssModule) {
    const scssName = new ScssName(path)

    if (Array.isArray(data)) {
        const scssList = new ScssList([])
        parent.addElement(scssName, scssList)
        for (const [k, v] of data.entries()) {
            _mapConverter(options, v, scssName.path.concat([String(k)]), scssList, mod)
        }
    } else if (isPlainObject(data)) {
        let target
        if (path.length === 0) {
            target = mod
        } else {
            const scssMap = new ScssMap({})
            parent.addElement(scssName, scssMap)
            target = scssMap
        }

        for (const [k, v] of Object.entries(data)) {
            _mapConverter(options, v, scssName.path.concat([k]), target, mod)
        }
    } else {
        parent.addElement(scssName, ScssValue.coerce(data))
    }
}

/**
 * %<path> {
 *   /// comment
 *   <placeholderProperty>: value;
 * }
 */
function placeholderConverter(options: ScssOptions, data: ConvertData) {}

export function flatten(data: ConvertData): Flattened[] {
    const res = []
    _flatten(data, [], res)
    return res
}

function _flatten(data: any, path: string[], res: Flattened[]) {
    if (Array.isArray(data)) {
        if (path.length === 0) {
            throw new Error(`Start with array is not supported`)
        }
        for (const [i, v] of data.entries()) {
            _flatten(v, path.concat([String(i)]), res)
        }
    } else if (isPlainObject(data)) {
        for (const [k, v] of Object.entries(data)) {
            // TODO: maybe {_value, _comment}
            _flatten(v, path.concat([k]), res)
        }
    } else {
        res.push({ path: path.slice(0), value: Literal.parse(data) })
    }
}

class ScssName {
    readonly id: string
    readonly local: string

    constructor(public readonly path: string[]) {
        const converted = path.map(kebabCase)
        this.id = "$" + converted.join("-")
        this.local = converted[converted.length - 1]
    }
}

abstract class ScssElement {
    abstract render(out: string[], identLevel: number)
    // eslint-disable-next-line unused-imports/no-unused-vars
    addElement(name: ScssName, value: ScssElement): void {
        throw new Error("Can't add child")
    }
    protected ident(level: number): string {
        return "    ".repeat(level)
    }
}

class ScssModule extends ScssElement {
    public readonly elements: { [key: string]: ScssElement } = {}
    override render(out: string[], identLevel: number) {
        for (const [k, v] of Object.entries(this.elements)) {
            out.push(`${this.ident(identLevel)}${k}: `)
            v.render(out, identLevel)
            out.push(`;\n`)
        }
    }
    override addElement(name: ScssName, value: ScssElement): void {
        this.elements[name.id] = value
    }
}

class ScssMap extends ScssElement {
    constructor(public readonly values: { [key: string]: ScssElement }) {
        super()
    }
    override render(out: string[], identLevel: number) {
        const entries = Object.entries(this.values)
        const lastIndex = entries.length - 1
        out.push(`(\n`)
        for (const [i, [k, v]] of entries.entries()) {
            out.push(`${this.ident(identLevel + 1)}"${kebabCase(k)}": `)
            v.render(out, identLevel + 1)
            if (i !== lastIndex) {
                out.push(",")
            }
            out.push("\n")
        }
        out.push(`${this.ident(identLevel)})`)
    }

    override addElement(name: ScssName, value: ScssElement): void {
        this.values[name.local] = value
    }
}

class ScssList extends ScssElement {
    constructor(public readonly values: ScssElement[]) {
        super()
    }

    override render(out: string[], identLevel: number) {
        const lastIndex = this.values.length - 1

        switch (this.values.length) {
            case 0:
                out.push("()")
                break

            case 1:
                out.push("(")
                this.values[0].render(out, identLevel)
                out.push(",)")
                break

            default:
                out.push(`(\n`)
                for (const [i, v] of this.values.entries()) {
                    out.push(this.ident(identLevel + 1))
                    v.render(out, identLevel + 1)
                    if (i !== lastIndex) {
                        out.push(",")
                    }
                    out.push("\n")
                }
                out.push(`${this.ident(identLevel)})`)
                break
        }
    }

    override addElement(name: ScssName, value: ScssElement): void {
        this.values.push(value)
    }
}

class ScssValue extends ScssElement {
    static coerce(value: any): ScssElement {
        return new ScssValue(Literal.parse(value))
    }

    constructor(public readonly literal: Literal) {
        super()
    }

    override render(out: string[], _identLevel: number) {
        out.push(literalValue(this.literal))
    }
}

function literalValue(literal: Literal): string {
    const varValue = literal.unit ? `${literal.value}${literal.unit}` : String(literal.value)
    if (literal.flags.str) {
        return `"${varValue.replace(/"/, '\\"')}"`
    } else {
        return varValue
    }
}
