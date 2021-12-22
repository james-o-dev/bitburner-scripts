const flagsConfig = [
	['dry-run', false],
]

/** @param {NS} ns **/
export async function main(ns) {
	const flags = ns.flags(flagsConfig)
	const dryRun = flags['dry-run']
	const dryRunPrefix = dryRun ? '[DRY RUN] ' : ''
	const purchasedServers = ns.getPurchasedServers()
	const purchasedLimit = ns.getPurchasedServerLimit()

	ns.tprint(`Purchased server count: ${purchasedServers.length}/${purchasedLimit}`)

	const ram = getMaxAffordable(ns)

	if (ram) {
		const cost = ns.getPurchasedServerCost(ram)
		const ramf = `${ns.nFormat(ram, '0,0')}GB`

		// If at max servers, delete the one with the least ram.
		if (purchasedServers.length >= purchasedLimit) {
			const serverToDelete = purchasedServers.reduce((r, s) => !r || (ns.getServerMaxRam(s) < ns.getServerMaxRam(r)) ? s : r, null)

			if (!dryRun) ns.deleteServer(serverToDelete)
			ns.tprint(`${dryRunPrefix}Destroyed ${serverToDelete}`)
		}

		let server = dryRunPrefix.trim()
		if (!dryRun) server = ns.purchaseServer(`pserv${Math.random()}`, ram)
		ns.tprint(`Purchased ${server} | ${ramf} | ${ns.nFormat(cost, '$0,0.00')}`)
	}
}

/** @param {NS} ns **/
const getMaxAffordable = (ns) => {
	const money = ns.getPlayer().money

	for (let i = 20; i >= 0; i--) {
		const ram = Math.pow(2, i)
		const cost = ns.getPurchasedServerCost(ram)

		if (cost <= money) {
			return ram
		}
	}
}