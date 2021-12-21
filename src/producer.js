import { doPolling, GAME_CONSTANTS, getQueue, getServers, PORT, SCRIPT, setQueue, SETTINGS, stringify } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL')
	ns.tprint('run.js started.')

	// ns.kill('')

	const servers = getServers(ns)

	let targets = servers.filter(t => t.maxMoney && t.hasRootAccess && t.name !== GAME_CONSTANTS.HOME)

	while (true) {
		await doPolling(ns)

		const player = ns.getPlayer()

		// Get additional server details and sort by its value heuristic.
		// In the while loop to get updated information.
		targets = targets
			.filter(t => t.requiredHackingLevel <= player.hacking)
			.map(target => {
				let script
				let threads

				let value = target.maxMoney * ns.hackAnalyzeChance(target.name) * ns.hackAnalyze(target.name)
				value /= (ns.getGrowTime(target.name) + ns.getHackTime(target.name) + ns.getWeakenTime(target.name))
				target.value = value

				const moneyAvailable = ns.getServerMoneyAvailable(target.name)

				// If greater than security threshold, weaken.
				if (ns.getServerSecurityLevel(target.name) > target.minSecurityLevel + SETTINGS.SECURITY_THRESH) {
					script = SCRIPT.WEAKEN
					threads = Math.ceil((ns.getServerSecurityLevel(target.name) - target.minSecurityLevel) / GAME_CONSTANTS.WEAKEN_THREAD_ANALYZE)
				}
				// Else if money is lower than money threshold, grow.
				else if (moneyAvailable < (target.maxMoney * SETTINGS.MONEY_THRESH)) {
					script = SCRIPT.GROW
					const growthDiff = 1 + ((target.maxMoney - moneyAvailable) / moneyAvailable)
					threads = Math.ceil(ns.growthAnalyze(target.name, growthDiff))
				}
				// Else hack.
				else {
					script = SCRIPT.HACK
					const moneyDiff = moneyAvailable - (target.maxMoney * SETTINGS.MONEY_THRESH)
					threads = Math.ceil(ns.hackAnalyzeThreads(target.name, moneyDiff))
				}

				return {
					server: target.name,
					script,
					threads,
					value,
				}
			})
			// .sort((a, b) => b.value - a.value)


		let readyQueue = getQueue(ns, PORT.QUEUE_READY)
		const runningQueue = getQueue(ns, PORT.QUEUE_RUNNING)

		for(let target of targets) {
			// Do not add to ready queue if it is already in it, or running.
			if (readyQueue.find(rq => rq.server === target.server)) continue
			if (runningQueue.find(rq => rq.server === target.server)) continue

			readyQueue.unshift(target)
		}
		readyQueue = readyQueue.sort((a, b) => b.value - a.value)

		await setQueue(ns, PORT.QUEUE_READY, readyQueue)

		ns.clearLog()
		ns.print(stringify(readyQueue))
	}
}