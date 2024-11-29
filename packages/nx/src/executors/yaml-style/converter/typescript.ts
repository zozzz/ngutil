import { isPlainObject } from "lodash"

import { pascalCase } from "../../../util"
import { CommonOptions, ConvertData, ConverterOptions } from "./abstract"
import { Literal } from "./literal"

const tsTypes = ["class"] as const

export type TsType = "class"

export class TypescriptOptions extends CommonOptions {
    /**
     * @default "const-enum"
     */
    type?: TsType

    /**
     * @default true
     */
    durationAsInt?: boolean

    constructor(options: ConverterOptions) {
        super(options)

        if ("type" in options) {
            this.type = this.#parseType(options.type)
        } else {
            this.type = "class"
        }

        if (options.durationAsInt == null) {
            this.durationAsInt = true
        } else {
            this.durationAsInt = !!options.durationAsInt
        }
    }

    #parseType(value: any): TsType {
        if (tsTypes.includes(value)) {
            return value
        } else {
            throw new Error(`Invalid type: ${value}`)
        }
    }
}

export async function convertToTs(options: TypescriptOptions, data: ConvertData) {
    const mod = new TsModule({})
    _convertToEls(options, data, [], mod, mod)

    const result: string[] = [
        `/* eslint-disable */\n`,
        `/* eslint-disable prettier/prettier */\n`,
        `/* ! AUTO GENERATED DO NOT EDIT ! */\n\n`
    ]
    mod.render(result, 0)
    return result.join("").trim() + "\n"
}

function _convertToEls(
    options: TypescriptOptions,
    data: ConvertData,
    path: string[],
    parent: TsElement,
    mod: TsModule
) {
    for (const [k, v] of Object.entries(data)) {
        const currentPath = path.concat([k])
        const tsName = new TsName(currentPath)
        if (Array.isArray(v)) {
            if (parent === mod) {
                parent.addElement(tsName, new TsConst(tsName, TsValue.coerce(v)))
            } else {
                parent.addElement(tsName, TsValue.coerce(v))
            }
        } else if (isPlainObject(v)) {
            const tsClass = new TsClass(tsName)
            _convertToEls(options, v as ConvertData, path.concat([k]), tsClass, mod)
            mod.addElement(tsName, tsClass)
            if (parent !== mod) {
                parent.addElement(tsName, new TsRef(tsName))
            }
        } else {
            for (const [_name, _value] of literalVariants(tsName, v)) {
                if (parent === mod) {
                    parent.addElement(_name, new TsConst(_name, _value))
                } else {
                    parent.addElement(_name, _value)
                }
            }
        }
    }
}

const UnitVariants: { [key: string]: { postfix: string; convert: (v: any) => any } } = {
    // eslint-disable-next-line prettier/prettier
    "s": { postfix: "Ms", convert: value => value * 1000 },
    // eslint-disable-next-line prettier/prettier
    "ms": { postfix: "Ms", convert: value => value },
    "%": { postfix: "Percent", convert: value => value / 100.0 }
}

function literalVariants(orignalName: TsName, value: any) {
    const result: Array<[TsName, TsElement]> = []
    const tsValue = TsValue.coerce(value)

    result.push([orignalName, tsValue])

    if (tsValue instanceof TsValue) {
        const literal = tsValue.literal
        if (literal.unit) {
            const variant =
                literal.unit in UnitVariants
                    ? UnitVariants[literal.unit]
                    : { postfix: pascalCase(literal.unit), convert: v => v }
            const path = orignalName.path.slice(0)
            path[path.length - 1] = `${path[path.length - 1]}${variant.postfix}`
            const newName = new TsName(path)
            result.push([newName, new TsValue(new Literal(variant.convert(literal.value), undefined, literal.comment))])
        }
    }

    return result
}

class TsName {
    get isExportable() {
        return this.path.length === 1
    }

    readonly id: string
    readonly local: string

    constructor(public readonly path: string[]) {
        const converted = path.map(pascalCase)
        this.id = converted.join("_")
        this.local = converted[converted.length - 1]
    }
}

abstract class TsElement {
    abstract render(out: string[], identLevel: number): void
    addElement(name: TsName, value: TsElement): void {
        throw new Error("Can't add child")
    }
    protected ident(level: number): string {
        return "    ".repeat(level)
    }
}

class TsModule extends TsElement {
    constructor(public readonly exports: { [key: string]: TsElement }) {
        super()
    }
    override render(out: string[], identLevel: number): void {
        for (const [k, v] of Object.entries(this.exports)) {
            v.render(out, identLevel)
        }
    }
    override addElement(name: TsName, value: TsElement): void {
        this.exports[name.id] = value
    }
}

class TsClass extends TsElement {
    fields: { [key: string]: TsElement } = {}
    constructor(public name: TsName) {
        super()
    }

    override render(out: string[], identLevel: number): void {
        if (this.name.isExportable) {
            out.push("export ")
        }
        out.push(`class ${this.name.id} {\n`)

        for (const [k, v] of Object.entries(this.fields)) {
            if (v instanceof TsValue) {
                v.renderComment(out, identLevel + 1)
            }

            out.push(`${this.ident(identLevel + 1)}static readonly ${k} = `)
            v.render(out, identLevel + 1)
            out.push("\n")
        }

        out.push(`}\n\n`)
    }

    override addElement(name: TsName, value: TsElement): void {
        this.fields[name.local] = value
    }
}

class TsArray extends TsElement {
    constructor(public readonly values: TsElement[]) {
        super()
    }

    override render(out: string[], identLevel: number): void {
        const lastIndex = this.values.length - 1

        switch (this.values.length) {
            case 0:
                out.push("[] as const")
                break

            case 1:
                out.push("[")
                this.values[0].render(out, identLevel)
                out.push("] as const")
                break

            default:
                out.push(`[\n`)
                for (const [i, v] of this.values.entries()) {
                    out.push(this.ident(identLevel + 1))
                    v.render(out, identLevel + 1)
                    if (i !== lastIndex) {
                        out.push(",")
                    }
                    out.push("\n")
                }
                out.push(`${this.ident(identLevel)}] as const`)
                break
        }
    }
}

class TsDict extends TsElement {
    constructor(public readonly values: { [key: string]: TsElement }) {
        super()
    }

    override render(out: string[], identLevel: number): void {
        const entries = Object.entries(this.values)
        const lastIndex = entries.length - 1
        out.push(`{\n`)
        for (const [i, [k, v]] of entries.entries()) {
            out.push(`${this.ident(identLevel + 1)}"${pascalCase(k)}": `)
            v.render(out, identLevel + 1)
            if (i !== lastIndex) {
                out.push(",")
            }
            out.push("\n")
        }
        out.push(`${this.ident(identLevel)}} as const`)
    }
}

class TsValue extends TsElement {
    static coerce(value: any): TsElement {
        if (Array.isArray(value)) {
            return new TsArray(value.map(v => TsValue.coerce(v)))
        } else if (isPlainObject(value)) {
            return new TsDict(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, TsValue.coerce(v)])))
        } else {
            const parsed = Literal.parse(value)
            return new TsValue(parsed)
        }
    }

    constructor(public readonly literal: Literal) {
        super()
    }

    override render(out: string[], identLevel: number): void {
        if (this.literal == null) {
            out.push("null")
        } else {
            // TODO: duration as int option
            let value = this.literal.value
            if (this.literal.unit) {
                value += this.literal.unit
            }
            out.push(`${JSON.stringify(value)} as const`)
        }
    }

    renderComment(out: string[], identLevel: number) {
        if (this.literal.comment) {
            out.push(`${this.ident(identLevel)}/**\n`)
            out.push(`${this.ident(identLevel)} * ${this.literal.comment}\n`)
            out.push(`${this.ident(identLevel)} */\n`)
        }
    }
}

class TsConst extends TsElement {
    constructor(
        public readonly name: TsName,
        public readonly value: TsElement
    ) {
        super()
    }

    override render(out: string[], identLevel: number): void {
        if (this.value instanceof TsValue) {
            this.value.renderComment(out, identLevel)
        }

        out.push(`export const ${this.name.id} = `)
        this.value.render(out, identLevel)
        out.push("\n\n")
    }
}

class TsRef extends TsElement {
    constructor(public readonly ref: TsName) {
        super()
    }

    override render(out: string[], identLevel: number): void {
        out.push(this.ref.id)
    }
}
