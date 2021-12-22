import { GAME_CONSTANTS, killall } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
	killall(ns)
	ns.killall(GAME_CONSTANTS.HOME)
}