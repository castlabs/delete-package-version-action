# Delete Package Versions Actions

This action finds organisation packages that are linked to the 
repo the action is executed in and deletes versions that match the 
specified patterns.

## Inputs

### `name`

**Required** A regular expression that matches against the name of the
package.

### `version`

**Required** A regular expression that is matched against the name of the
version that is being searched for, i.e. `^1.0.0-SNAPSHOT$` for an exact match
or `.*-SNAPSHOT` for all snapshots.

### `type`

**Required** The package type, i.e. npm or maven etc.

### `token`

The access to token. The token must have permissions to read/write/delete 
packages. Defaults to github.token.

### `tag`

A regular expression that is matched against the name of the tag of a version.

### `untagged`

A boolean value that, if set to true, will cause all untagged version to be considered
for deletion.

## Example usage

```
- uses: castlabs/delete-package-version-action@v1.0
  with:
    name: ".*"
    version: "1.0-SNAPSHOT"
    type: "maven"
```

Delete all untagged containers
```
- uses: castlabs/delete-package-version-action@v1.0
  with:
    name: ".*"
    version: ".*"
    type: "container"
    untagged: true
```
