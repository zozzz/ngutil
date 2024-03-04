import { Literal } from "./literal"

export type ConvertData = { [key: string]: ConvertData | string | number | boolean }
export type ConverterFn = (options: any, data: ConvertData) => Promise<string>
export type ConverterOptions = { [key: string]: any }
export type Converter = {
    options: { new (option: ConverterOptions): CommonOptions }
    convert: ConverterFn
    ext: string
}
export type Converters = { [key: string]: Converter }
export type Values = Array<Literal>

export class CommonOptions {
    filename?: string
    protected _rawOptions: ConverterOptions

    constructor(options: ConverterOptions) {
        this._rawOptions = options
        this.filename = this._rawOptions.filename
    }
}

// export function eachValue(data: ConvertData): Values {
//     const res = []
//     _eachValue(data, [], res)
//     return res
// }

// function _eachValue(data: any, path: string[], res: Values) {
//     if (Array.isArray(data)) {
//         if (path.length === 0) {
//             throw new Error(`Start with array is not supported`)
//         }
//         for (const [i, v] of data.entries()) {
//             _eachValue(v, path.concat([String(i)]), res)
//         }
//     } else if (typeof data === "string") {
//         res.push(parseString(data, path.slice(0)))
//     } else if (typeof data === "number") {
//         res.push(new CommonValue({ path: path.slice(0), value: data }))
//     } else if (isPlainObject(data)) {
//         for (const [k, v] of Object.entries(data)) {
//             // TODO: maybe {_value, _comment}
//             _eachValue(v, path.concat([k]), res)
//         }
//     } else {
//         throw new Error(`Not supported value: ${data}`)
//     }
// }

// const RX_UNIT = /^([\d.\-+]+)\s*([^\d\s;]+)\s*(?:;\s*\/\/\/?\s*(.*?))?$/
// const RX_COMMON = /^([^;]+)\s*(?:;\s*\/\/\/?\s*(.*?))?$/
// function _parseLiteral(value: string, path: string[]) {
//     // TODO: redesign, use NumberWithUnit
//     const unitMatch = value.match(RX_UNIT)
//     if (unitMatch) {
//         return new DurationValue({ path, value: Number(unitMatch[1]), unit: unitMatch[2], comment: unitMatch[3] })
//     } else {
//         const commonMatch = value.match(RX_COMMON)
//         if (commonMatch) {
//             return new CommonValue({ path, value: commonMatch[1], comment: commonMatch[2] })
//         } else {
//             return new CommonValue({ path, value })
//         }
//     }
// }

// export function isInt(value: string): boolean {
//     return /^\d+$/.test(value)
// }

export function pascalCase(value: string): string {
    return value.replace(/(?:^\w|[A-Z]|\b\w)/g, match => match.toUpperCase()).replace(/[\s_-]+/g, "")
}

export function dashedCase(value: string): string {
    return pascalCase(value).replace(/[A-Z]/g, (match, i) =>
        i === 0 ? match.toLowerCase() : `-${match.toLowerCase()}`
    )
}
