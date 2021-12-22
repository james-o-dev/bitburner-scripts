import { doPolling, getQueue, getServers, PORT, setQueue, SCRIPT, SCRIPT_RAM, stringify } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL')
	ns.tail('consumer.js')

	const usable = getServers(ns).filter(s => s.hasRootAccess && s.maxRam > 0).sort((a, b) => b.maxRam - a.maxRam)

	while (true) {
		await doPolling(ns)

		let readyQueue = getQueue(ns, PORT.QUEUE_READY)
		let runningQueue = getQueue(ns, PORT.QUEUE_RUNNING)

		for (let i = 0; i < readyQueue.length; i++) {
			let queued = readyQueue[i]

			let {
				server: target,
				script,
				threads: reqThreads,
			} = queued

			let scriptRam
			switch (script) {
				case SCRIPT.GROW:
					scriptRam = SCRIPT_RAM.GROW
					break;
				case SCRIPT.HACK:
					scriptRam = SCRIPT_RAM.HACK
					break;
				case SCRIPT.WEAKEN:
					scriptRam = SCRIPT_RAM.WEAKEN
					break;
			}

			for (let server of usable) {
				let threads = 0

				if (reqThreads <= 0) break

				const threadsAvailable = Math.floor((server.maxRam - ns.getServerUsedRam(server.name)) / scriptRam)

				if (threadsAvailable === 0) continue
				else if (threadsAvailable > reqThreads) threads = threadsAvailable - reqThreads
				else threads = threadsAvailable

				if (threads > 0) {
					// Generate a pid, since pid is only generated after exec.
					const pid = Math.random().toString()

					ns.exec(script, server.name, threads, target, pid)
					runningQueue.push({ pid, server: server.name, target })

					reqThreads = reqThreads - threads
				}
			}
			if (reqThreads <= 0) {
				readyQueue[i] = null
			} else {
				queued.threads = reqThreads
				readyQueue[i] = queued
			}
		}

		readyQueue = readyQueue.filter(rq => Boolean(rq)).sort((a, b) => b.value - a.value)
		await setQueue(ns, PORT.QUEUE_READY, readyQueue)

		ns.clearLog()
		ns.print('READY')
		ns.print(stringify(readyQueue))
		await setQueue(ns, PORT.QUEUE_RUNNING, runningQueue)
		ns.print('RUNNING')
		ns.print(stringify(runningQueue))
	}

}