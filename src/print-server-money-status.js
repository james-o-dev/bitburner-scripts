import { doPolling, GAME_CONSTANTS, getServers, stringify } from 'shared.js'

const flagsConfig = [
    /**
     * sort-m: (Default) Descending order by maximum server money
     * sort-a: Descending order by available server money
     * sort-ap: Descending order by available percentage server money
     */
    ['sort-m', false],
    ['sort-a', false],
    ['sort-ap', false],
    /**
     * Pass this flag to only run this once and print it to the terminal.
     * Default this is false and will continuously run and update it's logs.
     */
    ['once', false],
]

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog('ALL')
    ns.tail('print-server-money-status.js')

    while (true) {
        const printServers = getPrintServers(ns)
        const flags = ns.flags(flagsConfig)

        if (flags.once) {
            ns.tprint(stringify(printServers))
            return
        } else {
            ns.clearLog()
            ns.print(stringify(printServers))
            await doPolling(ns)
        }
    }
}

/** @param {NS} ns **/
const getPrintServers = (ns) => {
    const flags = ns.flags(flagsConfig)

    let printServers = getServers(ns)
        .filter(t => {
            if (t.maxMoney <= 0) return false
            if (!t.hasRootAccess) return false
            if (t.name === GAME_CONSTANTS.HOME) return false
            if (t.requiredHackingLevel > ns.getPlayer().hacking) return false
            if (ns.hackAnalyzeChance(t.name) === 0) return false

            return true
        })
        .map(s => {
            const max = s.maxMoney
            const available = ns.getServerMoneyAvailable(s.name)
            const availablePercent = Math.round((available / max) * 100)

            return { name: s.name, max, available, availablePercent }
        })

    if (flags['sort-a']) printServers = printServers.sort((a, b) => b.available - a.available)
    else if (flags['sort-ap']) printServers = printServers.sort((a, b) => b.availablePercent - a.availablePercent)
    else printServers = printServers.sort((a, b) => b.max - a.max)

    return printServers.map(s => {
        return {
            name: s.name,
            max: ns.nFormat(s.max, '$0,0'),
            available: ns.nFormat(s.available, '$0,0'),
            availablePercent: `${s.availablePercent}%`
        }
    })
}