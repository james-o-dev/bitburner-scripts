import { GAME_CONSTANTS, killall, PORT, SCRIPT, SETTINGS, stringify } from 'shared.js'

const flagConfig = [
	['no-run', false],
]

/** @param {NS} ns **/
export async function main(ns) {
	const flags = ns.flags(flagConfig)


	// Get all servers.
	const servers = getServersRecursive(ns, GAME_CONSTANTS.HOME, null)
		.map(s => {
			const serverObject = getServerDetails(ns, s, { reservedRam: GAME_CONSTANTS.HOME ? SETTINGS.HOME_RESERVED_RAM : 0 })
			serverObject.hasRootAccess = nuke(ns, s)
			return serverObject
		})

	for (let server of servers) {
		if (server.hasRootAccess) await copyScripts(ns, server.name)
	}

	const serversString = stringify(servers)

	ns.clearPort(PORT.SERVERS)
	await ns.writePort(PORT.SERVERS, serversString)

	killall(ns)

	if (!flags['no-run']) {
		ns.kill('run.js', GAME_CONSTANTS.HOME)
		ns.spawn('run.js', 1)
	}
}

/** @param {NS} ns **/
const getServersRecursive = (ns, server, parent) => {
	return [
		server,
		...ns.scan(server)
			.filter(s => s !== parent)
			.map(s => getServersRecursive(ns, s, server))
			.flat()
	]
}

/** @param {NS} ns **/
const nuke = (ns, server) => {
	if (ns.hasRootAccess(server)) return true

	if (ns.fileExists('BruteSSH.exe')) {
		ns.brutessh(server)
	}
	if (ns.fileExists('FTPCrack.exe')) {
		ns.ftpcrack(server)
	}
	if (ns.fileExists('relaySMTP.exe')) {
		ns.relaysmtp(server)
	}
	if (ns.fileExists('SQLInject.exe')) {
		ns.sqlinject(server)
	}
	if (ns.fileExists('HTTPWorm.exe')) {
		ns.httpworm(server)
	}

	try {
		ns.nuke()
		return true
	} catch (_) {
		return false
	}
}

/** @param {NS} ns **/
const getServerDetails = (ns, name, { reserveRam = 0 } = {}) => {
	const maxRam = ns.getServerMaxRam(name) - reserveRam
	return {
		hasRootAccess: ns.hasRootAccess(name),
		maxMoney: ns.getServerMaxMoney(name),
		maxRam,
		minSecurityLevel: ns.getServerMinSecurityLevel(name),
		name: name,
		requiredHackingLevel: ns.getServerRequiredHackingLevel(name),
		serverGrowth: ns.getServerGrowth(name),
	}
}

/** @param {NS} ns **/
const copyScripts = async (ns, server) => {
	const files = [
		SCRIPT.GROW,
		SCRIPT.HACK,
		SCRIPT.SHARED,
		SCRIPT.WEAKEN,
	]
	return ns.scp(files, GAME_CONSTANTS.HOME, server)
}