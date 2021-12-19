const scriptNames = ['grow.js', 'weaken.js', 'hack.js']
const tools = ['BruteSSH.exe', 'FTPCrack.exe']
const fileName = 'config.txt'
const flagNames = [
	['deploy', false],
	['clean', false],
]

/** @param {NS} ns **/
export async function main(ns) {
	const home = getServerInfo(ns, 'home', null)
	const flags = ns.flags(flagNames)

	let servers = []
	flatten(servers, home)

	const scripts = scriptNames
		.map(s => {
			return {
				name: s,
				ram: ns.getScriptRam(s)
			}
		})

	const totalRam = servers.filter(s => s.hasRootAccess).reduce((r, s) => r += s.ram, 0)
	const scriptMostRam = scripts.reduce((r, s) => s.ram > r ? s.ram : r, 0)
	const config = {
		meta: {
			count: servers.length,
			totalRam,
			totalMinThreads: Math.floor(totalRam / scriptMostRam)
		},
		scripts,
		tools,
		servers,
	}

	await ns.write(fileName, JSON.stringify(config, null, 2), 'w')

	if (flags.clean) {
		ns.run('cleanup-kill.js')
		ns.tprint('clean ' + flags.clean)
	}
	else if (flags.deploy) {
		ns.run('deploy.js')
		ns.tprint('deploy ' + flags.deploy)
	}
}

const flatten = (list, parent) => {
	if (parent.children.length) {
		for (let child of parent.children) {
			list.push(child)
			flatten(list, child)
		}
	}
	delete parent.children
	delete parent.parent
}

/** @param {NS} ns **/
const getServerInfo = (ns, server, parent) => {

	const scan = ns.scan(server)
	const children = scan
		.filter(s => s !== server && s !== parent)
		.map(s => getServerInfo(ns, s, server))
	// .filter(s => s.own || s.canHack)

	const reqHacking = ns.getServerRequiredHackingLevel(server)
	const reqPorts = ns.getServerNumPortsRequired(server)

	return {
		name: server,
		ram: ns.getServerMaxRam(server),
		own: ns.getPurchasedServers().includes(server),
		maxMoney: ns.getServerMaxMoney(server),
		minSecurity: ns.getServerMinSecurityLevel(server),
		canHack: reqHacking <= ns.getHackingLevel() && reqPorts <= tools.length,
		hasRootAccess: ns.hasRootAccess(server),
		ls: ns.ls(server),
		hackTime: ns.getHackTime(server),
		weakenTime: ns.getWeakenTime(server),
		growTime: ns.getGrowTime(server),
		hackAnalyzeChance: ns.hackAnalyzeChance(server),
		parent,
		children,
	}
}