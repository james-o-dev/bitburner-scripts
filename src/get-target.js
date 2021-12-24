import { GAME_CONSTANTS, getServers, stringify } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
    // ns.disableLog('ALL')

    // Get the profitable server, based on the above metric.
    const target = getServers(ns)
        .filter(t => {
            if (t.maxMoney <= 0) return false
            if (!t.hasRootAccess) return false
            if (t.name === GAME_CONSTANTS.HOME) return false
            if (t.requiredHackingLevel > ns.getHackingLevel()) return false
            if (ns.hackAnalyzeChance(t.name) === 0) return false

            return true
        })
        .map(t => {
            let value = t.maxMoney * ns.hackAnalyzeChance(t.name)
            // value =  value * t.serverGrowth
            // value = value / (t.minSecurityLevel * ns.getHackingLevel())
            // value = value / (ns.getGrowTime(t.name) + ns.getHackTime(t.name) + ns.getWeakenTime(t.name))

            t.value = value
            return t
        })
        .sort((a, b) => b.value - a.value)

    ns.tprint(stringify(target[0]))
}