import { getQueue, PORT, setQueue, SETTINGS } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
	const [ target, pid ] = ns.args

	const money = await ns.hack(target)

	ns.toast(`Hacked ${target} for ${ns.nFormat(money, '$0,0')}!`, undefined, SETTINGS.TOAST_DURATION)

	// Remove from running.
	const running = getQueue(ns, PORT.QUEUE_RUNNING).filter(f => f.pid !== pid)
	await setQueue(ns, PORT.QUEUE_RUNNING, running)
}