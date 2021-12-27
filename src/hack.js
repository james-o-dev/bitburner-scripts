import { SETTINGS } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
	const [ target, poll ] = ns.args

	if (poll) {
		ns.print(`${new Date(Date.now() + poll).toLocaleString()} (${ns.tFormat(poll)})`)
		await ns.sleep(poll)
	}

	const money = await ns.hack(target)

	ns.toast(`Hacked ${target} for ${ns.nFormat(money, '$0,0')}!`, undefined, SETTINGS.TOAST_DURATION)
}