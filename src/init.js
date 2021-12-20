// Settings
const scriptNames = ['grow.js', 'weaken.js', 'hack.js']
const possibleTools = ['BruteSSH.exe', 'FTPCrack.exe', 'RelaySMTP.exe', 'HTTPWorm.exe', 'SQLInject.exe']
const threshMoney = 0.9 // Should not hack if below this % of max money
const threshSecurity = 3 // Should weaken until it is at most these levels above security
const configFileName = 'config.txt'
const homeReserved = 2.1 // Harcoded, use `mem init.js`
const weakenAnalyzeOneThread = 0.05 // How much one thread weakens.

const flagNames = [
	['deploy', false],
	['clean', false],
]

/** @param {NS} ns **/
export async function main(ns) {
	const tools = possibleTools.filter(t => ns.fileExists(t, 'home'))
	const home = getServerInfo(ns, 'home', null, tools)
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

	const homeMaxRam = ns.getServerMaxRam('home') - homeReserved
	const totalRam = servers.filter(s => s.hasRootAccess).reduce((r, s) => r + s.ram, 0) + homeMaxRam
	const scriptMostRam = scripts.reduce((r, s) => s.ram > r ? s.ram : r, 0)
	const config = {
		meta: {
			count: servers.length,
			totalRam,
			totalMinThreads: Math.floor(totalRam / scriptMostRam),
			homeMaxRam,
			threshMoney,
			threshSecurity,
			configFileName,
			weakenAnalyzeOneThread,
		},
		scripts,
		tools,
		servers,
	}

	await ns.write(configFileName, JSON.stringify(config, null, 2), 'w')

	if (flags.clean) {
		ns.spawn('cleanup-kill.js')
	}
	else if (flags.deploy) {
		ns.spawn('deploy.js')
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
const getServerInfo = (ns, server, parent, tools) => {

	const scan = ns.scan(server)
	const children = scan
		.filter(s => s !== server && s !== parent)
		.map(s => getServerInfo(ns, s, server, tools))

	const reqHacking = ns.getServerRequiredHackingLevel(server)
	const reqPorts = ns.getServerNumPortsRequired(server)

	const hackTime = ns.getHackTime(server)
	const weakenTime = ns.getWeakenTime(server)
	const growTime = ns.getGrowTime(server)

	const maxMoney = ns.getServerMaxMoney(server)
	const minSecurity = ns.getServerMinSecurityLevel(server)
	const hackAnalyzeChance = ns.hackAnalyzeChance(server)

	let value

	// Simple: Based on max-money times hack chance, divided by minimum security.
	// value = (s.maxMoney * s.hackAnalyzeChance) / s.minSecurity

	// Time-based: Based on max-money times hack chance, divided by the time it takes for the operations.
	value = (maxMoney * hackAnalyzeChance) / (hackTime + weakenTime + growTime)

	return {
		name: server,
		ram: ns.getServerMaxRam(server),
		own: ns.getPurchasedServers().includes(server),
		maxMoney,
		minSecurity,
		canHack: reqHacking <= ns.getHackingLevel() && reqPorts <= tools.length,
		hackAnalyzeChance,
		hasRootAccess: ns.hasRootAccess(server),
		ls: ns.ls(server),
		hackTime,
		weakenTime,
		growTime,
		value,
		parent,
		children,
	}
}