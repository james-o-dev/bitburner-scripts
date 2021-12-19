const configFileName = 'config.txt'

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL')

	const config = JSON.parse(await ns.read(configFileName))

	const logFileName = config.meta.logFileName

	await ns.write(logFileName, '', 'w')

	const targets = config.servers
		.filter(s => s.hasRootAccess && !s.own && s.hackAnalyzeChance > 0 && s.value)
		.sort((a, b) => b.value - a.value)

	let poll = 0
	let polls = []
	let startTimestamp

	while (true) {
		await ns.sleep(poll)

		startTimestamp = new Date().getTime()

		let returned = []
		for (let target of targets) {
			const targetReturn = hackTarget(ns, target, config)
			if (!targetReturn.threadsUsed) break
			returned.push(targetReturn)
		}

		// Keep a record of polls,
		// In case none were returned, we wait for a longer running script.
		polls = [...new Set([...polls, ...returned.map(tr => tr.poll)])].sort((a, b) => a - b)
		const pollsLog = `polls = ${polls.join(', ')}`
		poll = polls.shift()
		// Trim polls if there are too many.
		if (polls.length > 10) polls.splice(9, 99999999)

		// Strings for logging.
		const logged = stringify(returned)
		const dateTime = `UPDATED ${new Date().toLocaleString()}`
		const nextPoll = `NEXT UPDATE AT ${new Date(startTimestamp + poll).toLocaleString()} (${ns.tFormat(poll)})`
		const logDiv = '===================================='

		// Write to log file.
		await ns.write(logFileName, logged, 'a')
		await ns.write(logFileName, `\n${pollsLog}`, 'a')
		await ns.write(logFileName, `\n${dateTime}`, 'a')
		await ns.write(logFileName, `\n${nextPoll}`, 'a')
		await ns.write(logFileName, `\n${logDiv}`, 'a')

		// Write to log.
		ns.print(logged)
		ns.print(pollsLog)
		ns.print(dateTime)
		ns.print(nextPoll)
		ns.print(`APPENDED LOGS TO ${logFileName}`)
		ns.print(logDiv)
	}
}

/** @param {NS} ns **/
const hackTarget = (ns, target, config) => {
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
const nFormat = (ns, number) => ns.nFormat(number, '0,0')

const stringify = (obj) => JSON.stringify(obj, null, 2)