#!/usr/bin/env bash
# Builds a family landing and puts it on the family's host: <site>/<commit>, then the `current` link
# is switched in one rename, so a visitor never sees half a site. The last three builds stay for a
# rollback by hand. Caddy serves `current` of each site — the host's sites are described in one file,
# infra/Caddyfile.tmpl of the VibeMemory repository, and put there by its caddyApply.sh.
#
# Runs on the OWNER'S machine from the site's root: site-deploy --site /srv/<product>/site [--alias vibememory]
set -euo pipefail

# The SSH alias of the host is the memory product's: the family's sites share that host
readonly DEFAULT_ALIAS=vibememory
readonly KEEP=3
readonly SSH_OPTIONS=(-o BatchMode=yes -o ConnectTimeout=15 -o ConnectionAttempts=4)

sshAlias="${SITE_SSH_ALIAS:-$DEFAULT_ALIAS}"
site=""
fail() { printf 'Ошибка: %s\n' "$*" >&2; exit 1; }

while [ "$#" -gt 0 ]; do
  case "$1" in
    --alias) sshAlias="${2:-}"; shift 2 ;;
    --site) site="${2:-}"; shift 2 ;;
    -h | --help) printf 'Собрать лендинг и выложить на хост.\n\n  site-deploy --site /srv/<продукт>/site [--alias %s]\n' "$DEFAULT_ALIAS"; exit 0 ;;
    *) fail "неизвестный аргумент $1" ;;
  esac
done

case "$site" in /srv/*/site) ;; *) fail "--site должен быть вида /srv/<продукт>/site, а не «$site»" ;; esac
[ -f package.json ] && [ -f astro.config.mjs ] || fail "запускать из корня сайта"
[ -z "$(git status --porcelain)" ] || fail "есть незакоммиченные правки — выкладывается только закоммиченное"
build=$(git rev-parse --short=12 HEAD)

printf '1/2 Собираю лендинг (%s)\n' "$build"
bun run build >/dev/null
[ -f dist/index.html ] || fail "сборка не дала dist/index.html"

printf '2/2 Выкладываю\n'
# the script travels as an argument, the build as stdin
readonly REMOTE='set -euo pipefail
build=$1 site=$2 keep=$3
staging=$(mktemp -d)
trap '\''rm -rf "$staging"'\'' EXIT
tar -xzf - -C "$staging"
sudo install -d -o root -g root -m 755 "$site"
sudo rm -rf "$site/$build"
sudo cp -r "$staging" "$site/$build"
sudo chown -R root:root "$site/$build"
sudo find "$site/$build" -type d -exec chmod 755 {} + -o -type f -exec chmod 644 {} +
sudo ln -sfn "$build" "$site/current.new"
sudo mv -T "$site/current.new" "$site/current"
# the newest builds stay, the rest go; `current` is never among the removed
ls -1t "$site" | grep -vx -e current -e "$build" | tail -n +"$keep" | while read -r old; do sudo rm -rf "${site:?}/$old"; done
echo "Выложена сборка $build"
'
# macOS extended attributes stay home: GNU tar on the host would warn on every file
COPYFILE_DISABLE=1 tar --no-xattrs --no-mac-metadata -C dist -czf - . | ssh "${SSH_OPTIONS[@]}" "$sshAlias" "bash -c $(printf '%q' "$REMOTE") deploy $(printf '%q' "$build") $site $KEEP"
