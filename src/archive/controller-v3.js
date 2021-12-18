/** @param {NS} ns **/
export async function main(ns) {
	const purchased = ns.getPurchasedServers()
	const list = [...purchased]
	scan(ns, '', 'home', list)

	const targetList = getTargetServers(ns, list, purchased)

	let poll = 0

	while (true) {
		await ns.sleep(poll)

		let minPoll = 999999999999
		const returns = []
		for(let target of targetList) {
			const returned = hackTarget(ns, target, list)
			if (returned) {
				returns.push(returned)
				if (returned.poll < minPoll) minPoll = returned.poll
			}
		}
		poll = minPoll

		ns.print('=================================')
		// ns.print('threadsUsed: ', threadsUsed)
		// ns.print('message: ', message)
		ns.print(JSON.stringify(returns, null, 2))
		ns.print('poll: ', ns.tFormat(poll, false))
		ns.print('=================================')
	}
}

/** @param {NS} ns **/
const hackTarget = (ns, target, serverList) => {
	const targetMoney = ns.getServerMoneyAvailable(target)
	const maxMoney = ns.getServerMaxMoney(target)
	const moneyThresh = maxMoney * 0.75;
	const targetSecurity = ns.getServerSecurityLevel(target)
	const securityThresh = ns.getServerMinSecurityLevel(target) + 5;

	let script = ''
	let threadsToUse = 0
	let poll = 0
	let message = ''

	if (targetSecurity >= securityThresh) {
		message = 'securityThresh: ' + targetSecurity + '>=' + securityThresh
		script = 'weaken.js'
		poll = ns.getWeakenTime(target)

		// threadsToUse = 9999
		const weakenTarget = targetSecurity - securityThresh
		threadsToUse = weakenRecursive(ns, weakenTarget, 0, 200, 0)

	} else if (targetMoney < moneyThresh) {
		message = 'moneyThresh: ' + targetMoney + ' < ' + moneyThresh
		script = 'grow.js'
		poll = ns.getGrowTime(target)
		const percentToGrow = (maxMoney - targetMoney) / maxMoney
		threadsToUse = ns.growthAnalyze(target, 1 + percentToGrow)
	} else {
		script = 'hack.js'
		poll = ns.getHackTime(target)
		threadsToUse = ns.hackAnalyzeThreads(target, targetMoney - moneyThresh)
	}

	if (poll) poll += 1000
	threadsToUse = Math.ceil(threadsToUse)

	let threadsUsed = 0
	let scriptRam = ns.getScriptRam(script)
	for (let server of serverList) {
		if (threadsUsed > threadsToUse) continue

		const threads = Math.floor((ns.getServerMaxRam(server) - ns.getServerUsedRam(server)) / scriptRam)
		ns.print('threads '+ threads)
		ns.print('ns.getServerMaxRam(server) '+ ns.getServerMaxRam(server))
		ns.print('ns.getServerUsedRam(server) '+ ns.getServerUsedRam(server))
		if (threads >= 1) {
			ns.exec(script, server, threads, target)
			threadsUsed = threadsUsed + threads
		}
	}
	if (!threadsUsed) return null

	return {
		target,
		script,
		message,
		threadsToUse,
		threadsUsed,
		poll,
		pollf: ns.tFormat(poll),
	}
}


/** @param {NS} ns **/
const weakenRecursive = (ns, target, start, end, count) => {
	const limit = 10

	let half = end - start
	const startAnalyze = ns.weakenAnalyze(start)
	const halfAnalyze = ns.weakenAnalyze(half)
	const endAnalyze = ns.weakenAnalyze(end)

	ns.print('weakenRecursive count: ' + count)
	ns.print('weakenRecursive halfAnalyze: ' + halfAnalyze)
	ns.print('weakenRecursive target: ' + target)

	if (count > limit) {
		return Math.abs(target - startAnalyze) > Math.abs(endAnalyze - target) ? end : start
	}
	if (target === halfAnalyze) return half

	count++

	if (halfAnalyze > target) {
		return weakenRecursive(ns, target, half, end, count)
	} else {
		return weakenRecursive(ns, target, start, half, count)
	}
}

const getTargetServers = (ns, list, purchased) => {
	return list.filter(s => !purchased.includes(s))
		.map(s => {
			const maxMoney = ns.getServerMaxMoney(s)
			const minSecurity = ns.getServerMinSecurityLevel(s)
			// const hackTime = ns.getHackTime(s)
			// const weakenTime = ns.getWeakenTime(s)
			// const growthTime = ns.getGrowTime(s)

			const value = maxMoney / minSecurity

			return {
				name: s,
				value
			}
		}).sort((a, b) => b.value - a.value)
		.map(s => s.name)
}

/** @param {NS} ns **/
const scan = (ns, parent, server, list) => {
	const children = ns.scan(server)
	for (let child of children) {
		if (parent == child) continue

		if (!ns.hasRootAccess(child)) continue

		list.push(child)

		scan(ns, server, child, list)
	}
}