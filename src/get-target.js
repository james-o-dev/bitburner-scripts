import { GAME_CONSTANTS, getServers, stringify } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
    // ns.disableLog('ALL')
    const n = ns.args[0] || 1
		const includeTiming = ns.args[1] || false

    const excludeTargets = [
        'n00dles'
    ]

    // Get the profitable server, based on the above metric.
    const target = getServers(ns)
        .filter(t => {
            if (excludeTargets.includes(t.name)) return false
            if (t.maxMoney <= 0) return false
            if (!t.hasRootAccess) return false
            if (t.name === GAME_CONSTANTS.HOME) return false
            if (t.requiredHackingLevel > ns.getHackingLevel()) return false
            if (ns.hackAnalyzeChance(t.name) === 0) return false

            return true
        })
        .map(t => {
						let growTime = ns.getGrowTime(t.name)
						let hackTime = ns.getHackTime(t.name)
						let weakenTime = ns.getWeakenTime(t.name)

						if (ns.fileExists('Formulas.exe')) {
							const server = ns.getServer(t.name)
							const player = ns.getPlayer()
							growTime = ns.formulas.hacking.growTime(server, player)
							hackTime = ns.formulas.hacking.hackTime(server, player)
							weakenTime = ns.formulas.hacking.weakenTime(server, player)
						}

            let value = t.maxMoney * ns.hackAnalyzeChance(t.name)
            value = value * t.serverGrowth
            value = value / t.minSecurityLevel
						if (includeTiming) value = value / (growTime + hackTime + weakenTime) // For mainly testing.

            t.value = value
						t.hackTime = ns.tFormat(hackTime)
						t.growTime = ns.tFormat(growTime)
						t.weakenTime = ns.tFormat(weakenTime)
            return t
        })
        .sort((a, b) => b.value - a.value)

    const printMe = target.splice(0, n)
    ns.tprint(stringify(printMe))
}