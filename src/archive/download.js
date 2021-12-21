/**
 * Add any scripts in the repo here.
 */
 const scripts = [
	'cleanup-kill.js',
	'controller.js',
	'deploy.js',
	'grow.js',
	'hack.js',
	'init.js',
	'killall.js',
	'nuker.js',
	'weaken.js',
]

/**
 * Note: this repository must be public.
 * - Assumes all the scripts are together in one git folder
 */
const baseUrl = 'https://raw.githubusercontent.com/james-o-dev/bitburner-scripts/master/src/'

/** @param {NS} ns **/
export async function main(ns) {
	let host
	if (host) {
		host = ns.args[0]
		ns.tprint(`host: ${host}`)
	} else {
		host = 'home'
	}

	let failed
	for (let script of scripts) {
		const url = baseUrl + script

		const downloaded = await ns.wget(url, script, host)
		if (downloaded) {
			ns.tprint(`[downloaded] ${script} => ${url}`)
		} else {
			failed = `[failed] ${script} => ${url}`
			break
		}
	}

	if (!failed) {
		ns.tprint('All scripts downloaded.')
	} else {
		ns.tprint(failed)
		// Clean-up.
		scripts.forEach(s => ns.rm(s, host))
	}
}