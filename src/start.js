import { GAME_CONSTANTS, PORT, SETTINGS, stringify } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
	// Get all servers.
	const servers = getServersRecursive(ns, GAME_CONSTANTS.HOME, null)
		.map(s => {
			const serverObject = getServerDetails(ns, s, { reservedRam: GAME_CONSTANTS.HOME ? SETTINGS.HOME_RESERVED_RAM : 0 })
			serverObject.hasRootAccess = nuke(ns, s)
			// await copyScripts(ns, s)
			return serverObject
		})

	const serversString = stringify(servers)
	// ns.tprint(serversString)
	ns.clearPort(PORT.SERVERS)
	await ns.writePort(PORT.SERVERS, serversString)

	// ns.run('/new/run.js', 1)
	// ns.run('/new/consumer.js', 1)
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

const copyScripts = async (ns, server) => {

}