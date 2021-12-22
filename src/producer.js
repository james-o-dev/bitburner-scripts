import { doPolling, GAME_CONSTANTS, getQueue, getServers, PORT, SCRIPT, setQueue, SETTINGS, stringify } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL')
	ns.tail('producer.js')

	ns.clearPort(PORT.QUEUE_READY)
	ns.clearPort(PORT.QUEUE_RUNNING)

	while (true) {
		await doPolling(ns)

		const player = ns.getPlayer()

		const readyQueue = getQueue(ns, PORT.QUEUE_READY)
		const runningQueue = getQueue(ns, PORT.QUEUE_RUNNING)

		let maxValue = 0
		const targets = getServers(ns)
			.filter(t => {

				if (t.maxMoney <= 0) return false
				if (!t.hasRootAccess) return false
				if (t.name === GAME_CONSTANTS.HOME) return false
				if (t.requiredHackingLevel > player.hacking) return false
				if (ns.hackAnalyzeChance(t.name) === 0) return false

				return true
			})
			.map(target => {
				let script
				let threads

				let value = target.maxMoney * ns.hackAnalyzeChance(target.name) * ns.hackAnalyze(target.name)
				value = value / (ns.getGrowTime(target.name) + ns.getHackTime(target.name) + ns.getWeakenTime(target.name))

				if (value > maxValue) maxValue = value

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
					const growthDiff = 1 + ((target.maxMoney - moneyAvailable) / target.maxMoney)
					threads = Math.ceil(ns.growthAnalyze(target.name, growthDiff))
				}
				// Else hack.
				else {
					script = SCRIPT.HACK
					const moneyDiff = moneyAvailable - moneyMinimum
					threads = Math.ceil(ns.hackAnalyzeThreads(target.name, moneyDiff))
				}

				return {
					target: target.name,
					script,
					threads,
					value,
				}
			})
			.filter(nrq => {
				if (nrq.value < (maxValue * SETTINGS.VALUE_THRESH)) return false
				if (readyQueue.find(rq => rq.target === nrq.target)) return false
				if (runningQueue.find(rq => rq.target === nrq.target)) return false
				return true
			})

		let newReadyQueue = [...readyQueue, ...targets]
			.sort((a, b) => b.value - a.value)
		// .filter((_, i) => !SETTINGS.MAX_TARGETS || (i < SETTINGS.MAX_TARGETS))

		await setQueue(ns, PORT.QUEUE_READY, newReadyQueue)

		ns.clearLog()
		ns.print(stringify(readyQueue))
		ns.print(`READY: ${readyQueue.length}`)
	}
}