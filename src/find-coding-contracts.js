import { getServers } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
	const servers = getServers(ns)

	let serversWithCCTs = []
	for (const server of servers) {
		const hasCCT = ns.ls(server.name, '.cct')
		if (hasCCT.length) serversWithCCTs.push(server.name)
	}

	if (!serversWithCCTs.length) {
		ns.tprint('No Coding Contracts found.')
	} else {
		serversWithCCTs = serversWithCCTs.sort()
		ns.tprint('Found Coding Contracts:')
		for (const serverName of serversWithCCTs) {
			ns.tprint(serverName)
		}
	}
}