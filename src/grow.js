import { getQueue, PORT, setQueue } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
	const [ target, pid ] = ns.args

	await ns.grow(target)

	// Remove from running.
	const running = getQueue(ns, PORT.QUEUE_RUNNING).filter(f => f.pid !== pid)
	await setQueue(ns, PORT.QUEUE_RUNNING, running)
}