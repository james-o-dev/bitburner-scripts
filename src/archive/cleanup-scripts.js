/** @param {NS} ns **/
export async function main(ns) {
	const filenames = [
		'early-hack-template.script',
		'early-hack-template.js',
		'grow.js',
		'hack.js',
		'weaken.js',
	]
	const servers = [
		...ns.scan(),
		...ns.getPurchasedServers()
	]

	for(let i = 0; i < servers.length; i++) {
		const server = servers[i]
		filenames.forEach(script => {
			ns.scriptKill(script, server)
			ns.rm(script, server)
		})
	}
}