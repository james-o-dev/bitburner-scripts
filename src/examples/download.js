/**
 * Download script into Bitburner, directly from a public git repository
 * Examples from https://github.com/Skyl3lazer/bitburnerscripts
 *
 * @example `run download.js` // Download all the files
 * @example `run download.js --rm` // Remove the files
 */

// Add
const files = [
	'hack/client.ns',
	'hack/grow.ns',
	'hack/hack.ns',
	'hack/targetfinder.ns',
	'hack/weaken.ns',
	'alphanuke.ns',
	'scanall.ns',
	'stonks.ns',
]
const github = 'https://raw.githubusercontent.com/Skyl3lazer/bitburnerscripts/main/'

/** @param {NS} ns **/
export async function main(ns) {
	const flags = ns.flags([
		['rm', false]
	])

	if (flags.rm) {
		files.forEach(f => ns.rm(f, 'home'))
		return
	}

	for (let f of files) {
		await ns.wget(github + f, f, 'home')
		ns.tprint(`${f} downloaded`)
	}
}