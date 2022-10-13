import core from "@actions/core";
import github from "@actions/github";
// noinspection ES6UnusedImports
import {paginateRest, composePaginateRest} from "@octokit/plugin-paginate-rest"

function filterPackages(res, repo, nameMatcher) {
  return res.data
    .filter(d => d.repository.name === repo)
    .filter(d => nameMatcher.test(d.name))
    .map(d => {
      return {name: d.name, count: d.version_count}
    })
}

function filterVersions(res, pkgName, versionMatcher) {
  return res.data
    .filter(d => versionMatcher.test(d.name))
    .map(d => {
      return {name: pkgName, version: d.name, id: d.id}
    })
}

async function main() {
  const packageNamePattern = core.getInput('name') || process.env.PKG_NAME_PATTERN;
  const packageVersionPattern = core.getInput('version') || process.env.PKG_VERSION_PATTERN;
  const packageType = core.getInput('type') || process.env.PKG_TYPE;
  const token = core.getInput('token') || process.env.GITHUB_TOKEN;
  const {owner, repo} = github.context.repo

  if (!packageVersionPattern) {
    throw new Error(`No package version pattern specified. Please configure the 'version' input`)
  }
  if (!packageNamePattern) {
    throw new Error(`No package name pattern specified. Please configure the 'name' input`)
  }
  if (!packageType) {
    throw new Error(`No package type specified. Please configure the 'type' input`)
  }

  const packageNameMatcher = new RegExp(packageNamePattern)
  const packageVersionMatcher = new RegExp(packageVersionPattern)
  const octokit = github.getOctokit(token)
  core.info(`Searching for packages in ${repo} that match the name-pattern: '${packageNamePattern}' and version-pattern: ${packageVersionPattern} with package-type: ${packageType}`)

  // list packages for repo to find all packages that match the package name
  // pattern and belong to this repo
  let allPackages = await octokit.paginate('GET /orgs/{org}/packages',
    { org: owner, package_type: packageType },
    (res) => filterPackages(res, repo, packageNameMatcher)
  )
  core.info(`Found ${allPackages.length} packages that match '${packageNamePattern}' in repo ${repo}`)

  // Find all the version in the packages that match the
  // version pattern
  let matchingVersions = []
  for (let i = 0; i < allPackages.length; i++) {
    let pkg = allPackages[i];
    let versions = await octokit.paginate('GET /orgs/{org}/packages/{package_type}/{package_name}/versions',
      {package_type: packageType, package_name: pkg.name, org: owner},
      (res) => filterVersions(res, pkg.name, packageVersionMatcher)
    )
    matchingVersions = matchingVersions.concat(versions)
  }
  core.info(`Found ${matchingVersions.length} versions that match '${packageVersionPattern}' in repo ${repo} for ${allPackages.length} matched packages`)
  let encounteredError = false;
  //delete the versions that we matched
  for (let i = 0; i < matchingVersions.length; i++) {
    let v = matchingVersions[i]
    core.info(`Deleting Name: ${v.name} Version: ${v.version} Id: ${v.id}`)
    try {
      await octokit.request('DELETE /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}', {
        package_type: packageType,
        package_name: v.name,
        package_version_id: v.id,
        org: owner,
      })
    }catch (e) {
      core.error(`'Error while trying to delete Name: ${v.name} Version: ${v.version} Id: ${v.id}: ${e.message}`)
      encounteredError = true
    }
  }
  if(encounteredError) {
    throw new Error('An error occurred while deleting versions. Please check the log for details.')
  }
}

main();
