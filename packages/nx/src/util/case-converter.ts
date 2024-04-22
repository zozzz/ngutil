import { camelCase, upperFirst, kebabCase } from "lodash"
export { camelCase, kebabCase }

export function pascalCase(value: string): string {
    return upperFirst(camelCase(value))
}

// export function kebabCase(value: string): string {
//     return Case.kebab(value)
// }

// export function camelCase(value: string): string {
//     return Case.camel(value)
// }
