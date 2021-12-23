import { getQueue, PORT, setQueue } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
	const [ target, poll, last ] = ns.args

	await ns.sleep(poll)

	await ns.weaken(target)

	// Remove from running, if it was the last script in the sequence.
	if (last) {
		const running = getQueue(ns, PORT.QUEUE_RUNNING).filter(f => f !== target)
		await setQueue(ns, PORT.QUEUE_RUNNING, running)
	}
}