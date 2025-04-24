import { camelCase, kebabCase, upperFirst } from "es-toolkit"

export { camelCase, kebabCase }

export function pascalCase(value: string): string {
    return upperFirst(camelCase(value))
}
