# DEVELOPMENT

## Commit message format

[conventional commits](https://www.conventionalcommits.org)

types:

- **fix:** Bug fixes
- **feat:** Features
- **chore:** Others
- **style:** Formatting

scopes:

- **tools** - development tools, scripts, etc...
- **ci** - CI/CD
- **docs** - Documentations
- **release** - Release version
- **<package_name>** - package names under `packages` folder

## Add new package

```sh
nx g @nx/angular:lib "<package_name>" --directory="packages/<package_name>" --importPath="@ngutil/<package_name>" -p nu --style=scss --inlineTemplate --strict --publishable
```

Add this to `package.json`

```json
"publishConfig": {
    "access": "public",
    "directory": "../../dist/packages/<package_name>/"
}
```

### Storybook

#### Add

```sh
nx g @nx/angular:storybook-configuration --project="<package_name>"
```

#### Run

```sh
nx storybook "<package_name>"
```


## Release process

`pnpm release`

