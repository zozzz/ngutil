import * as ObjectPathGetter from "object-path"
import * as ObjectPathParser from "objectpath"
import * as path from "path"

const IMPORT_REGEX = "^import\\(('|\"|`)(?<import>.*?)\\1\\)(?<opath>[.[].+?)$"

/**
 * ```ts
 * const value = await importValue("import('from').Path.To.Value")
 * ```
 */
export async function importValue(expr: any, root: string) {
    if (typeof expr !== "string") {
        return expr
    }

    const match = expr.match(IMPORT_REGEX)
    if (!match) {
        return expr
    }

    const opath = ObjectPathParser.parse(match.groups["opath"].replace(/^\./, ""))
    const imp = path.join(root, match.groups["import"])
    const mod = await import(imp)
    return ObjectPathGetter.get(mod, opath)
}
