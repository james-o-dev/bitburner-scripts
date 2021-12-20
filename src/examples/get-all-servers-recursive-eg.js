/** @param {NS} ns **/
export async function main(ns) {
	const servers = getServersRecursive(ns, 'home', null).filter(s => s !== 'home')
	ns.tprint(JSON.stringify(servers, null, 2))

	// ns.tryWritePort(1, servers) // e.g. write to a port
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