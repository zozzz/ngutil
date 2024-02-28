# webmanifest

## Usage

Install

```sh
nx add @ngutil/webmanifest
```

Add to `project.json`

```json
{
    // ...
    "targets": {
        // ...
        "webmanifest": {
            "executor": "@ngutil/webmanifest:generate",
            "options": {
                // ...
            }
        }
    }
}
```

### Example to `project.json`

```json
{
    "tragets": {
        "webmanifest": {
            "executor": "@ngutil/webmanifest:generate",
            "options": {
                "iconPath": "packages/<project-name>/src/main-icon.png",
                "indexHtml": "packages/<project-name>/src/index.html",
                "indexHtmlReplaceTag": "MANIFEST",
                "outputPath": "packages/<project-name>/src/assets/manifest",
                "commitMessage": "chore(app): Update manifest",
                "packageJson": "./package.json",
                "manifest": {
                    "path": "assets/manifest",
                    "appName": "<project-name>",
                    "appShortName": "<app-name>",
                    "appDescription": "<app-name>",
                    "lang": "hu-HU",
                    "background": "#00827C",
                    "theme_color": "#00827C",
                    "display": "standalone",
                    "orientation": "portrait",
                    "scope": "/",
                    "start_url": "/"
                }
            }
        }
    }
}
```

For availbale options run:

```sh
nx run <project-name>:<target> --help
```

## Autmatically copy options from `package.json` if not present in `manifest` option

| `manifest` | `package.json` |
| ---------- | -------------- |
| `version` | `version` |
| `appName` | `name` |
| `appDescription` | `description` |
| `developerName` | `author.name` |
| `developerURL` | `author.url` |
