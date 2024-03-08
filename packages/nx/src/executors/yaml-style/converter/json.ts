import { isPlainObject } from "is-plain-object"

import { pascalCase } from "../../../util"
import { CommonOptions, ConvertData, ConverterOptions } from "./abstract"
import { Literal } from "./literal"

export class JsonOptions extends CommonOptions {
    constructor(options: ConverterOptions) {
        super(options)
    }
}

export async function convertToJson(options: JsonOptions, data: ConvertData) {
    const obj = _convertToJson(options, data)
    return JSON.stringify(obj, null, 2)
}

export function _convertToJson(options: JsonOptions, data: any): any {
    if (isPlainObject(data)) {
        const res = {}
        for (const [k, v] of Object.entries(data)) {
            res[pascalCase(k)] = _convertToJson(options, v)
        }
        return res
    } else if (Array.isArray(data)) {
        return data.map(v => _convertToJson(options, v))
    } else {
        // TODO: LiteralVaraints from TS
        const literal = Literal.parse(data)
        return literal.unit ? `${literal.value}${literal.unit}` : literal.value
    }
}
