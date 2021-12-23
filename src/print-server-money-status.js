import { GAME_CONSTANTS, getServers, stringify } from 'shared.js'

const flagsConfig = [
    /**
     * m: Descending order by maximum server money
     * a: Descending order by available server money
     * ap: Descending order by available percentage server money
     */
    ['sort', 'm'],
]

/** @param {NS} ns **/
export async function main(ns) {
    const flags = ns.flags(flagsConfig)
    const sort = flags.sort

    let printServers = getServers(ns)
        .filter(s => s.maxMoney && s.hasRootAccess && s.name !== GAME_CONSTANTS.HOME)
        .map(s => {

            const max = ns.getServerMaxMoney(s.name)
            const available = ns.getServerMoneyAvailable(s.name)
            const availablePercent = Math.round((available / max) * 100)

            return { name: s.name, max, available, availablePercent }
        })

    switch (sort) {
        case 'a':
            printServers = printServers.sort((a, b) => b.max - a.max)
            break;

        case 'ap':
            printServers = printServers.sort((a, b) => b.availablePercent - a.availablePercent)
            break;

        case 'm':
        default:
            printServers = printServers.sort((a, b) => b.max - a.max)
            break;
    }

    printServers = printServers.map(s => {
        return {
            name: s.name,
            max: ns.nFormat(s.max, '$0,0'),
            available: ns.nFormat(s.available, '$0,0'),
            availablePercent: `${s.availablePercent}%`
        }
    })

    ns.tprint(stringify(printServers))
}