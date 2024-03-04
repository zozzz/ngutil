# yaml-style

## Usage

Install

```sh
nx add @ngutil/nx
```

Add to `package.json`

```json
{
    // ...
    "targets": {
        // ...
        "webmanifest": {
            "executor": "@ngutil/nx:yaml-style",
            "options": {
                // ...
            }
        }
    }
}
```

## Yaml file format

```yaml
meta:
    ts: {}
    scss:
        # - flatten: (default) convert content into flattened variables
        # - map: convert content to scss map
        type: flatten | map
    json: {}
content:
    variable: value
    # ...
```
