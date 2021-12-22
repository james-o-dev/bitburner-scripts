import { GAME_CONSTANTS, PORT, SCRIPT, SETTINGS, stringify } from 'shared.js'

const flagConfig = [
	['run', false],
	['killall', false],
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

	if (flags.run) {
		ns.kill('producer.js')
		ns.run('producer.js', 1)
		ns.kill('consumer.js')
		ns.spawn('consumer.js', 1)
	} else if (flags.killall) {
		ns.run('killall.js', 1)
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

	try {
		ns.nuke()
		return true
	} catch (_) {
		return false
	}
}

/** @param {NS} ns **/
const getServerDetails = (ns, name, { reserveRam } = {}) => {
	const maxRam = ns.getServerMaxRam(name) - reserveRam
	return {
		hasRootAccess: ns.hasRootAccess(name),
		maxMoney: ns.getServerMaxMoney(name),
		maxRam,
		minSecurityLevel: ns.getServerMinSecurityLevel(name),
		name: name,
		requiredHackingLevel: ns.getServerRequiredHackingLevel(name),
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