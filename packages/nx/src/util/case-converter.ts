import { camelCase, kebabCase, upperFirst } from "lodash"

export { camelCase, kebabCase }

export function pascalCase(value: string): string {
    return upperFirst(camelCase(value))
}
