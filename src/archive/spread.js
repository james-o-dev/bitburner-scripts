/** @param {NS} ns **/
export async function main(ns) {
	const portsRequired = 1
	const dir = ns.getHostname()

	const files = [
		'controller.js',
		'grow.js',
		'hack.js',
		'weaken.js',
		'spread.js',
	]

	const servers = [
		...ns.getPurchasedServers(),
		...getServers(ns, dir)
	]

	// Get target.
	const target = servers.map(s => {
		const moneyValue = ns.getServerMaxMoney(s) / ns.getGrowTime(s)
		const securityValue = ns.getServerMinSecurityLevel(s) / ns.getWeakenTime(s)

		return {
			name: s,
			value: moneyValue / securityValue,
		}
	}).sort((a, b) => b.value - a.value)[0].name

	for (let i = 0; i < servers.length; i++) {
		const server = servers[i]

		if (!ns.hasRootAccess) {
			if (ns.fileExists('BruteSSH.exe', 'home')) ns.brutessh(server)
			ns.nuke(server)
		}

		await ns.scp(files, dir, server)

		// const children = getServers(ns, server)
		// if (children.length) ns.exec('spread.js', server, 1)
	}

	if (servers.length) ns.run('controller.js', 1, target)
}

const getServers = (ns, server) => {
	const maxPortsRequired = 1

	return ns.scan(server)
		.filter(s => {
			return ns.getServerNumPortsRequired(s) <= maxPortsRequired
				&& ns.getServerRequiredHackingLevel(s) <= ns.getHackingLevel()
		})
}