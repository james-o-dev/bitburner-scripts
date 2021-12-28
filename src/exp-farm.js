import { getScriptServerThreads, getUsableServers, kill, SETTINGS, SCRIPT } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
	const flags = ns.flags([
		['kill', false]
	])
	const target = ns.args[0] || 'joesguns'

	const usable = getUsableServers(ns)

	kill(ns, SCRIPT.WEAKEN, [target])

	if (flags.kill) {
		ns.tprint(`Kill ${target} scripts only.`)
		return
	}

	let poll = 0
	while(true) {
		await ns.sleep(poll)
		poll = SETTINGS.POLL

		for (const server of usable) {
			const threads = getScriptServerThreads(ns, server, 9999999, SCRIPT.WEAKEN)
			if (threads) ns.exec(SCRIPT.WEAKEN, server.name, threads, target)
		}
	}
}