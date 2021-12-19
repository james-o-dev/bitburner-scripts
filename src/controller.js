const configFileName = 'config.txt'
const queueMaxLength = 10 // Maximum length of the queue; If it goes above, use a longer timestamp to reduce the queue length
const pollDelay = 2000 // Extra delay when polling; Acts as minimum.

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL')

	const config = JSON.parse(await ns.read(configFileName))

  // Get target servers to hack.
	let targets = config.servers.filter(s => s.hasRootAccess && !s.own && s.hackAnalyzeChance > 0 && s.value)
  // Only choose targets of above average value and sort them from highest value to lowest.
  const avgValue = targets.reduce((a, t) => a + t.value, 0) / targets.length
  targets = targets.filter(t => t.value > avgValue).sort((a, b) => b.value - a.value)

	let poll = 0
	let queue = []
	let startTimestamp
  let timestampFinish

	while (true) {
		await ns.sleep(poll)

		startTimestamp = getTimestamp()

		// Remove all running threads which have since finished.
		queue = queue.filter(r => r.timestampFinish > startTimestamp)

		let returned = []
		for (let target of targets) {
			const targetExec = hackTarget(ns, target, config, queue)
			if (targetExec.threadsUsed) {
				returned.push(targetExec)
			}
		}

		// Get next timestamp.
		queue = [...queue, ...returned].sort((a, b) => a.timestampFinish - b.timestampFinish)

    if (queue.length > queueMaxLength) {
      // If the queue reaches at certain length, wait longer until it reduces.
      const queueStart = queue.length - queueMaxLength
      timestampFinish = queue[queueStart].timestampFinish
    } else {
      // Else, get next poll from next timestamp.
      timestampFinish = queue.shift().timestampFinish
    }
    poll = timestampFinish - startTimestamp + pollDelay

		// Write to log.
		ns.clearLog()
		ns.print(`QUEUE [${queue.length}]:`)
		ns.print(stringify(queue))
		ns.print(`UPDATED ${getTimestamp(startTimestamp, undefined, true)}`)
		ns.print(`NEXT UPDATE AT ${getTimestamp(startTimestamp, poll, true)} (${ns.tFormat(poll)})`)
		ns.print('====================================')
	}
}

/** @param {NS} ns **/
const hackTarget = (ns, target, config, queue) => {
	// From config.
	const scripts = config.scripts
	const usableServers = config.servers.filter(s => s.hasRootAccess)
	const homeMaxRam = config.meta.homeMaxRam - config.meta.homeReserved
	const threshMoney = config.meta.threshMoney
	const threshSecurity = config.meta.threshSecurity
	const weakenAnalyzeOneThread = config.meta.weakenAnalyzeOneThread

	// From target.
	const serverMoneyAvailable = ns.getServerMoneyAvailable(target.name)
	const serverSecurityLevel = ns.getServerSecurityLevel(target.name)
	const minMoneyToHack = target.maxMoney * threshMoney

	// Variables.
	let script
	let threadsRequired = 0
	let threadsUsed = 0
	let poll = 0
	let message = ''
	let threads = 0

	// If above certain security - weaken
	if (serverSecurityLevel > target.minSecurity + threshSecurity) {
		script = 'weaken.js'
		poll = target.weakenTime
		threadsRequired = (serverSecurityLevel - target.minSecurity) / weakenAnalyzeOneThread

		message = 'weaken by ' + nFormat(ns, serverSecurityLevel - target.minSecurity)
	}
	// Else if below certain money - grow
	else if (serverMoneyAvailable < minMoneyToHack) {
		script = 'grow.js'
		poll = target.growTime
		const growToThreshPct = 1 + ((target.maxMoney - serverMoneyAvailable) / target.maxMoney)
		threadsRequired = ns.growthAnalyze(target.name, growToThreshPct)
		message = 'grow by ' + nFormat(ns, target.maxMoney - serverMoneyAvailable)
	}
	// Else - hack
	else {
		script = 'hack.js'
		poll = target.hackTime
		const hackToThresh = serverMoneyAvailable - minMoneyToHack
		threadsRequired = ns.hackAnalyzeThreads(target.name, hackToThresh)
		message = 'hack by ' + nFormat(ns, hackToThresh)
	}
	const scriptRam = scripts.find(s => s.name === script).ram

	// Constraints for the threads required.
	threadsRequired = Math.ceil(threadsRequired)

	// Add on already used threads of this script for this target.
	const alreadyRunningThreads = queue.filter(r => r.target === target.name && r.script === script).reduce((t, ar) => t + ar.threadsUsed, 0)
	threadsRequired -= alreadyRunningThreads

	if (threadsRequired > 0) {
		// Use home.
		const homeAvailRam = homeMaxRam - ns.getServerUsedRam('home')
		threads = Math.floor(homeAvailRam / scriptRam)
		if (threadsRequired - threadsUsed < threads) threads = threadsRequired - threadsUsed
		if (threads > 0) {
			ns.exec(script, 'home', threads, target.name)
			threadsUsed += threads
		}

		// Use other servers.
		for (let server of usableServers) {
			const availRam = server.ram - ns.getServerUsedRam(server.name)
			threads = Math.floor(availRam / scriptRam)
			if (threadsRequired - threadsUsed < threads) threads = threadsRequired - threadsUsed
			if (threads > 0) {
				ns.exec(script, server.name, threads, target.name)
				threadsUsed += threads
			}
		}
	}

	const timestampFinish = getTimestamp(undefined, poll)
	return {
		target: target.name,
		script,
		threadsRequired,
		threadsUsed,
		// poll,
		timestampFinish,
		value: target.value,
		// pollf: ns.tFormat(poll),
		timestampFinishf: getTimestamp(timestampFinish, poll, true),
		message,
	}
}

/** @param {NS} ns **/
const nFormat = (ns, number) => ns.nFormat(number, '0,0')

const stringify = (obj) => JSON.stringify(obj, null, 2)

const getTimestamp = (date = Date.now(), addMs = 0, toString = false) => {
	const timestamp = new Date(date).getTime() + addMs
	return toString ? new Date(timestamp).toLocaleString() : timestamp
}
