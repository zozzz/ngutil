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
