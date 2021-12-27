/** @param {NS} ns **/
export async function main(ns) {
	const [ target, poll ] = ns.args

	if (poll) {
		ns.print(`${new Date(Date.now() + poll).toLocaleString()} (${ns.tFormat(poll)})`)
		await ns.sleep(poll)
	}

	await ns.weaken(target)
}