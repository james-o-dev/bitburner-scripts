import { SETTINGS } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
    const [target] = ns.args

    const moneyThresh = ns.getServerMaxMoney(target) * SETTINGS.MONEY_THRESH
    const securityThresh = ns.getServerMinSecurityLevel(target) * SETTINGS.SECURITY_THRESH

    while (true) {
        if (ns.getServerSecurityLevel(target) > securityThresh) {
            // If the server's security level is above our threshold, weaken it
            await ns.weaken(target)
        } else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
            // If the server's money is less than our threshold, grow it
            await ns.grow(target)
        } else {
            // Otherwise, hack it
            const money = await ns.hack(target)
            ns.toast(`Hacked ${target} for ${ns.nFormat(money, '$0,0')}!`, undefined, SETTINGS.TOAST_DURATION)
        }
    }
}