import { format } from '../i18n'
import { appReleases, kindAttribute, kindOf, newestBuild, toMb, type KindRule, type Release } from '../releases'

export interface LiveReleasesOptions<Kind extends string, Os extends string> {
  /** GitHub API address of the releases list */
  api: string
  /** Kinds of downloadable assets, in the order of preference */
  kinds: readonly KindRule<Kind, Os>[]
  /** Platforms that have a download button */
  oses: readonly Os[]
  /** How many releases the releases panel lists */
  shown: number
}

const dateOf = (iso: string): string =>
  new Intl.DateTimeFormat(document.documentElement.lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(iso),
  )

/**
 * Refreshes download buttons, the version line and the releases list from GitHub
 * The page was built with the releases of its build; a release made after the deploy shows up here
 * Every caption is a catalog template from a data attribute: this file holds no interface text
 * If GitHub refuses, the built links stay: they are working links, just possibly not the newest
 */
export const initLiveReleases = <Kind extends string, Os extends string>(options: LiveReleasesOptions<Kind, Os>): void => {
  const { api, kinds, oses, shown } = options
  void (async () => {
    let releases: Release[]
    try {
      const response = await fetch(api, { headers: { Accept: 'application/vnd.github+json' } })
      if (!response.ok) return
      releases = appReleases((await response.json()) as Release[])
    } catch {
      return
    }
    const latest = releases[0]
    if (latest === undefined) return

    for (const os of oses) {
      const build = newestBuild(releases, os, kinds)
      if (build === undefined) continue
      document.querySelectorAll<HTMLAnchorElement>(`[data-dl="${os}"]`).forEach((link) => {
        link.href = build.url
      })
      document.querySelectorAll<HTMLElement>(`[data-dl-sub="${os}"]`).forEach((sub) => {
        const template = sub.dataset.template
        if (template !== undefined) sub.textContent = format(template, { version: build.version, size: build.sizeMb })
      })
    }

    document.querySelectorAll<HTMLElement>('[data-version]').forEach((line) => {
      const template = line.dataset.template
      if (template !== undefined) {
        line.textContent = format(template, { version: latest.tag_name, date: dateOf(latest.published_at) })
      }
    })

    document.querySelectorAll<HTMLElement>('[data-releases]').forEach((panel) => {
      const list = panel.querySelector<HTMLElement>('[data-releases-list]')
      const itemTemplate = panel.dataset.itemTemplate
      const sizeTemplate = panel.dataset.sizeTemplate
      if (list === null || itemTemplate === undefined || sizeTemplate === undefined) return

      const items = releases.slice(0, shown).map((release) => {
        const li = document.createElement('li')
        const title = document.createElement('span')
        title.className = 'release-title'
        title.textContent = format(itemTemplate, { version: release.tag_name, date: dateOf(release.published_at) })
        li.append(title)

        const assets = document.createElement('span')
        assets.className = 'release-assets'
        for (const asset of release.assets) {
          const kind = kindOf(asset.name, kinds)
          const label = kind === undefined ? undefined : panel.dataset[kindAttribute(kind)]
          if (label === undefined) continue
          const link = document.createElement('a')
          link.href = asset.browser_download_url
          link.rel = 'noopener'
          const name = document.createElement('span')
          name.textContent = label
          const size = document.createElement('span')
          size.className = 'size'
          size.textContent = format(sizeTemplate, { size: toMb(asset.size) })
          link.append(name, size)
          assets.append(link)
        }
        li.append(assets)
        return li
      })
      list.replaceChildren(...items)
    })
  })()
}
