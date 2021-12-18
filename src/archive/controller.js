/** @param {NS} ns **/
export async function main(ns) {
	const target = ns.args[0]

	if (!target) throw new Error('Did not specify target as argument.')

	const grow = 'grow.js'
	const weaken = 'weaken.js'
	const hack = 'hack.js'

	const growMem = ns.getScriptRam(grow)
	const weakenMem = ns.getScriptRam(weaken)
	const hackMem = ns.getScriptRam(hack)

	const moneyThresh = ns.getServerMaxMoney(target) * 0.75;
	const securityThresh = ns.getServerMinSecurityLevel(target) + 5;

	let poll = 0

	const servers = [
		...ns.getPurchasedServers(),
		...ns.scan('home').filter(s => ns.hasRootAccess(s))
	].map(server => {
		return {
			server,
			ram: ns.getServerMaxRam(server),
		}
	})

	while (true) {
		await ns.sleep(poll)

		let script = ''
		let scriptRam = 0
		let scriptTime = 0
		const targetSecurity = ns.getServerSecurityLevel(target)
		const targetMoney = ns.getServerMoneyAvailable(target)

		if (targetSecurity > securityThresh) {
			scriptRam = weakenMem
			script = weaken
			scriptTime = ns.getWeakenTime(target)
		} else if (targetMoney < moneyThresh) {
			scriptRam = growMem
			script = grow
			scriptTime = ns.getGrowTime(target)
		} else {
			scriptRam = hackMem
			script = hack
			scriptTime = ns.getHackTime(target)
		}

		servers.forEach(({ server, ram }) => {
			ns.killall(server)
			ram = ram - ns.getServerUsedRam()
			const t = Math.floor(ram / scriptRam)
			ns.exec(script, server, t, target)
		})

		ns.print('securityThresh: ' + securityThresh)
		ns.print('targetSecurity: ' + targetSecurity)
		ns.print('moneyThresh: ' + moneyThresh)
		ns.print('targetMoney: ' + targetMoney)
		ns.print('script: ' + script)

		poll = scriptTime + 1000
		let seconds = poll / 1000
		const minutes = Math.floor(seconds / 60)
		seconds = seconds - (minutes * 60)
		ns.print('poll: ' + minutes + 'm' + seconds + 's')

		ns.print('===')
	}
}