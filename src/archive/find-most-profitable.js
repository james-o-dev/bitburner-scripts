/**
 * @param {NS} ns
 */
 export async function main(ns) {
	const myServers = ns.getPurchasedServers()
	const servers = ns.scan('home')
		.filter(s => {
			return !myServers.includes(s)
			&& ns.hasRootAccess(s)
		})
	let ranking = []

	for(let i = 0; i < servers.length; i++) {
		const name = servers[i]
		const money = ns.getServerMaxMoney(name)
		const minSecurity = ns.getServerMinSecurityLevel(name)

		const value = money / minSecurity
		ranking.push({
			name,
			money,
			minSecurity,
			value
		})
	}
	ranking = ranking.sort((a, b) => b.value - a.value)
	ns.tprintf(JSON.stringify(ranking, null, 2))
	ns.tprintf(ranking[0].name)
}