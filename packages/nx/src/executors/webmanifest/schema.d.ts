export interface GenerateExecutorSchema {
    iconPath: string
    indexHtml?: string
    indexHtmlOutput?: string
    indexHtmlReplaceTag?: string
    outputPath: string
    packageJson: string
    manifest: { [key: string]: any }
    commitMessage?: string
    noCommit?: boolean
    clean?: boolean
}
