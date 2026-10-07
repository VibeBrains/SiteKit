/**
 * GitHub releases for the download buttons of a landing, shared by the build and the browser
 * Releases can be per platform: a fix for one platform makes "latest" that platform's release,
 * so every button looks for the newest build of its own platform instead of trusting `releases/latest`
 */

export interface Asset {
  name: string
  size: number
  browser_download_url: string
}

export interface Release {
  tag_name: string
  published_at: string
  draft: boolean
  assets: Asset[]
}

export interface Build {
  version: string
  url: string
  sizeMb: number
}

/** One kind of downloadable asset: the site names each kind from its catalog, in the order of preference */
export interface KindRule<Kind extends string = string, Os extends string = string> {
  kind: Kind
  os: Os
  test: RegExp
}

export const releasesApi = (repo: string, perPage: number): string =>
  `https://api.github.com/repos/${repo}/releases?per_page=${perPage}`

export const toMb = (bytes: number): number => Math.round(bytes / 1024 / 1024)

/** Only app releases `vX.Y.Z`: helper and upstream releases are not downloads for people, drafts are not out yet */
export const appReleases = (all: readonly Release[]): Release[] =>
  all.filter((release) => /^v\d+\.\d+\.\d+$/.test(release.tag_name) && !release.draft)

/** Kind of an asset, or undefined for files that are not builds for people (SBOM and the like) */
export const kindOf = <Kind extends string>(name: string, kinds: readonly KindRule<Kind>[]): Kind | undefined =>
  kinds.find((entry) => entry.test.test(name))?.kind

/** Newest build of one platform; among the assets of a release the kind listed first wins */
export const newestBuild = <Kind extends string, Os extends string>(
  releases: readonly Release[],
  os: Os,
  kinds: readonly KindRule<Kind, Os>[],
): Build | undefined => {
  const rank = (kind: Kind | undefined) => kinds.findIndex((entry) => entry.kind === kind)
  for (const release of releases) {
    const candidates = release.assets
      .map((asset) => ({ asset, rule: kinds.find((entry) => entry.test.test(asset.name)) }))
      .filter((entry) => entry.rule !== undefined && entry.rule.os === os)
      .sort((a, b) => rank(a.rule?.kind) - rank(b.rule?.kind))
    const best = candidates[0]
    if (best !== undefined) {
      return { version: release.tag_name, url: best.asset.browser_download_url, sizeMb: toMb(best.asset.size) }
    }
  }
  return undefined
}

/**
 * Releases as of the build: the page ships working download links even without scripts
 * GitHub can refuse (rate limit, no network): the page then links to the releases list, and the browser fills it in
 */
export const fetchReleases = async (api: string): Promise<Release[]> => {
  try {
    const response = await fetch(api, { headers: { Accept: 'application/vnd.github+json' } })
    if (!response.ok) {
      console.warn(`[releases] GitHub API: HTTP ${response.status}, the page links to the releases list`)
      return []
    }
    return appReleases((await response.json()) as Release[])
  } catch (error) {
    console.warn(`[releases] GitHub API unavailable (${String(error)}), the page links to the releases list`)
    return []
  }
}

/** Data attribute of the releases panel that holds the catalog name of a kind: `winSetup` → `data-kind-win-setup` */
export const kindAttribute = (kind: string): string => `kind${kind.charAt(0).toUpperCase()}${kind.slice(1)}`
