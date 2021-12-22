import { getQueue, PORT, setQueue } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
	const [ target, pid ] = ns.args

	const money = await ns.hack(target)

	ns.toast(`Hacked ${target} for $${ns.nFormat(money, '0,0')}!`)

	// Remove from running.
	const running = getQueue(ns, PORT.QUEUE_RUNNING).filter(f => f.pid !== pid)
	await setQueue(ns, PORT.QUEUE_RUNNING, running)
}