const threshMoney = 0.75 // Should not hack if below this % of max money
const threshSecurity = 5 // Should weaken until it is at most these levels above security
const configFileName = 'config.txt'
const logFileName = 'logs.txt'
const homeReserved = 7.5 // Harcoded, use `mem init.js`
const homeMaxRam = 256 - homeReserved // Hardcoded, use `free`

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL')

	const config = JSON.parse(await ns.read(configFileName))

	ns.rm(logFileName)
	await ns.write(logFileName, '', 'a')

	const usableServers = config.servers.filter(s => s.hasRootAccess)
	const targets = config.servers
		.filter(s => s.hasRootAccess && !s.own && s.hackAnalyzeChance > 0)
		.map(s => {
			// Based on max-money times changes, divided by minimum security.
			// const simpleValue = (s.maxMoney * s.hackAnalyzeChance) / s.minSecurity
			// s.value = simpleValue

			// Take into account the time it takes for operations.
			const timeValue = (s.maxMoney * s.hackAnalyzeChance) / (s.hackTime + s.weakenTime + s.growTime)
			s.value = timeValue

			return s
		})
		.filter(s => s.value)
		.sort((a, b) => b.value - a.value)

	let poll = 0
	let polls = []

	while (true) {
		await ns.sleep(poll)

		let returned = []
		for (let target of targets) {
			const targetReturn = hackTarget(ns, target, usableServers, config.scripts)
			if (!targetReturn.threadsUsed) break
			returned.push(targetReturn)
		}

		// Keep a record of polls,
		// In case none were returned, we wait for a longer running script.
		polls = [...polls, ...returned.map(tr => tr.poll)].sort((a, b) => a - b)
		const pollsLog = `polls = ${polls.join(', ')}`
		poll = polls.shift()
		// Trim polls if there are too many.
		if (polls.length > 10) polls.slice(9, polls.length - 1)

		// Strings for logging.
		const logged = JSON.stringify(returned, null, 4)
		const nextPoll = `NEXT UPDATE IN ${ns.tFormat(poll)}`
		const logDiv = '===================================='

		// Write to log file.
		await ns.write(logFileName, logged, 'a')
		await ns.write(logFileName, `\n${pollsLog}`, 'a')
		await ns.write(logFileName, `\n${nextPoll}`, 'a')
		await ns.write(logFileName, `\n${logDiv}`, 'a')

		// Write to log.
		ns.print(logged)
		ns.print(pollsLog)
		ns.print(nextPoll)
		ns.print(`APPENDED LOGS TO ${logFileName}`)
		ns.print(logDiv)
	}
}

/** @param {NS} ns **/
const hackTarget = (ns, target, usableServers, scripts) => {
	const serverMoneyAvailable = ns.getServerMoneyAvailable(target.name)
	const serverSecurityLevel = ns.getServerSecurityLevel(target.name)
	const minMoneyToHack = target.maxMoney * threshMoney
	let script
	let threadsRequired = 0
	let threadsUsed = 0
	let poll = 0
	let message = ''

	// If above certain security - weaken
	if (serverSecurityLevel > target.minSecurity + threshSecurity) {
		script = 'weaken.js'
		poll = target.weakenTime
		// const weakenToThresh = serverSecurityLevel - target.minSecurity
		// threadsRequired = weakenAnalyzeRecursive(ns, weakenToThresh, 0, 9999, 0)
		threadsRequired = serverSecurityLevel - target.minSecurity // TODO: TEMP, until I figure out `ns.weakenAnalyze()`
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
	poll += 1000
	const scriptRam = scripts.find(s => s.name === script).ram
	threadsRequired = Math.ceil(threadsRequired)

	// Use home.
	const homeAvailRam = homeMaxRam - ns.getServerUsedRam('home')
	let homeThreads = Math.floor(homeAvailRam / scriptRam)
	if (threadsRequired - threadsUsed < homeThreads) homeThreads = threadsRequired - threadsUsed
	if (homeThreads) {
		ns.exec(script, 'home', homeThreads, target.name)
		threadsUsed += homeThreads
	}

	// Use other servers.
	for (let server of usableServers) {
		const availRam = server.ram - ns.getServerUsedRam(server.name)
		let threads = Math.floor(availRam / scriptRam)
		if (threadsRequired - threadsUsed < threads) threads = threadsRequired - threadsUsed

		if (threads) {
			ns.exec(script, server.name, threads, target.name)
			threadsUsed += threads
		}
	}

	return {
		target: target.name,
		threadsRequired,
		threadsUsed,
		poll,
		pollf: ns.tFormat(poll),
		script,
		message,
	}
}

/** @param {NS} ns **/
const weakenAnalyzeRecursive = (ns, target, start, end, count) => {
	const limit = 50

	let half = end - start
	const startAnalyze = Math.abs(ns.weakenAnalyze(start))
	const halfAnalyze = Math.abs(ns.weakenAnalyze(half))
	const endAnalyze = Math.abs(ns.weakenAnalyze(end))

	ns.print(`target ${target}`)
	ns.print(`startAnalyze ${startAnalyze}`)
	ns.print(`halfAnalyze ${halfAnalyze}`)
	ns.print(`endAnalyze ${endAnalyze}`)
	ns.print(`count ${count}`)

	// ns.print('weakenRecursive count: ' + count)
	// ns.print('weakenRecursive halfAnalyze: ' + halfAnalyze)
	// ns.print('weakenRecursive target: ' + target)

	if (count > limit) {
		return Math.abs(target - startAnalyze) > Math.abs(endAnalyze - target) ? end : start
	}
	if (target === halfAnalyze) return half

	count++

	if (halfAnalyze > target) {
		return weakenAnalyzeRecursive(ns, target, half, end, count)
	} else {
		return weakenAnalyzeRecursive(ns, target, start, half, count)
	}
}

/** @param {NS} ns **/
const nFormat = (ns, number) => ns.nFormat(number, '0,0')