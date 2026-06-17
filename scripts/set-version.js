/*
 * Build version injector.
 *
 * Reads VERSION from .env (falls back to package.json) and writes it into
 * package.json so electron-builder picks it up. This runs automatically before
 * every `npm run dist*` via the "version:sync" script.
 *
 * .env is git-ignored, so each machine/release can set its own version without
 * committing it. Last GitHub release was v1.1 — bump VERSION in .env per release.
 */
const fs = require("fs")
const path = require("path")

const root = path.join(__dirname, "..")
const envPath = path.join(root, ".env")
const pkgPath = path.join(root, "package.json")

function readEnv(file) {
	const out = {}
	if (!fs.existsSync(file)) return out
	for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
		const line = raw.trim()
		if (!line || line.startsWith("#")) continue
		const eq = line.indexOf("=")
		if (eq === -1) continue
		const key = line.slice(0, eq).trim()
		let val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
		out[key] = val
	}
	return out
}

const env = readEnv(envPath)
let version = env.VERSION || env.APP_VERSION || process.env.VERSION
if (!version) {
	console.log("[set-version] No VERSION in .env; keeping package.json version.")
	process.exit(0)
}
version = version.replace(/^v/i, "") // accept "v1.2.0" or "1.2.0"
if (!/^\d+\.\d+\.\d+/.test(version)) {
	console.error(`[set-version] "${version}" is not a valid semver (e.g. 1.2.0). Aborting.`)
	process.exit(1)
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
if (pkg.version === version) {
	console.log(`[set-version] version already ${version}`)
} else {
	pkg.version = version
	fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n")
	console.log(`[set-version] package.json version -> ${version}`)
}
