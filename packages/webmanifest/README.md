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
