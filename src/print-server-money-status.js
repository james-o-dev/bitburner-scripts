import { doPolling, GAME_CONSTANTS, getServers, stringify } from 'shared.js'

const flagsConfig = [
    /**
     * m: Descending order by maximum server money
     * a: Descending order by available server money
     * ap: Descending order by available percentage server money
     */
    ['sort', 'm'],
    /**
     * Pass this flag to only run this once and print it to the terminal.
     * Default this is false and will continuously run and update it's logs.
     */
    ['once', false],
]

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog('ALL')

    const once = ns.flags(flagsConfig).once

    if (!once) ns.tail('print-server-money-status.js')

    while (true) {
        const printServers = getPrintServers(ns)
        ns.clearLog()
        ns.print(stringify(printServers))

        if (once) {
            ns.tprint(stringify(printServers))
            return
        }
        await doPolling(ns)
    }
}

/** @param {NS} ns **/
const getPrintServers = (ns) => {
    const sort = ns.flags(flagsConfig).sort

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

    return printServers.map(s => {
        return {
            name: s.name,
            max: ns.nFormat(s.max, '$0,0'),
            available: ns.nFormat(s.available, '$0,0'),
            availablePercent: `${s.availablePercent}%`
        }
    })
}