import { doPolling, GAME_CONSTANTS, getQueue, getServers, PORT, SCRIPT, setQueue, SETTINGS, stringify } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL')
	ns.tail('producer.js')

	while (true) {
		await doPolling(ns)

		const player = ns.getPlayer()

		const readyQueue = getQueue(ns, PORT.QUEUE_READY)

		// Get additional server details and sort by its value heuristic.
		// In the while loop to get updated information.
		const targets = getServers(ns)
			.filter(t => {
				const runningQueue = getQueue(ns, PORT.QUEUE_RUNNING)

				if (t.maxMoney < 0) return false
				if (!t.hasRootAccess) return false
				if (t === GAME_CONSTANTS.HOME) return false
				if (t.requiredHackingLevel > player.hacking) return false
				if (readyQueue.find(rq => rq.server === t.name)) return false
				if (runningQueue.find(rq => rq.server === t.name)) return false

				return true
			})
			.map(target => {
				let script
				let threads

				let value = target.maxMoney * ns.hackAnalyzeChance(target.name) * ns.hackAnalyze(target.name)
				value = value / (ns.getGrowTime(target.name) + ns.getHackTime(target.name) + ns.getWeakenTime(target.name))

				const moneyAvailable = ns.getServerMoneyAvailable(target.name)
				const moneyMinimum = target.maxMoney * SETTINGS.MONEY_THRESH

				// If greater than security threshold, weaken.
				if (ns.getServerSecurityLevel(target.name) > target.minSecurityLevel + SETTINGS.SECURITY_THRESH) {
					script = SCRIPT.WEAKEN
					threads = Math.ceil((ns.getServerSecurityLevel(target.name) - target.minSecurityLevel) / GAME_CONSTANTS.WEAKEN_THREAD_ANALYZE)
				}
				// Else if money is lower than money threshold, grow.
				else if (moneyAvailable < moneyMinimum) {
					script = SCRIPT.GROW
					const growthDiff = 1 + ((target.maxMoney - moneyAvailable) / moneyAvailable)
					threads = Math.ceil(ns.growthAnalyze(target.name, growthDiff))
				}
				// Else hack.
				else {
					script = SCRIPT.HACK
					const moneyDiff = moneyAvailable - moneyMinimum
					threads = Math.ceil(ns.hackAnalyzeThreads(target.name, moneyDiff))
				}

				return {
					server: target.name,
					script,
					threads,
					value,
				}
			})
			.filter(t => t.value > 0)

		const newReadyQueue = [...readyQueue, ...targets].sort((a, b) => b.value - a.value)
		await setQueue(ns, PORT.QUEUE_READY, newReadyQueue)

		ns.clearLog()
		ns.print(stringify(readyQueue))
	}
}