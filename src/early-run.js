import { GAME_CONSTANTS, getScriptServerThreads, getUsableServers, SCRIPT, stringify } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
    const [target] = ns.args

    const usable = getUsableServers(ns).filter(f => f.name !== GAME_CONSTANTS.HOME)
    const home = getUsableServers(ns).filter(f => f.name === GAME_CONSTANTS.HOME)[0]

    for (const server of usable) {
        const threads = getScriptServerThreads(ns, server, 9999, SCRIPT.EARLY_SCRIPT)
        if (threads > 0) ns.exec(SCRIPT.EARLY_SCRIPT, server.name, threads, target)
    }

    const homeThreads = getScriptServerThreads(ns, home, 9999, SCRIPT.EARLY_SCRIPT)
    if (homeThreads > 0) ns.spawn(SCRIPT.EARLY_SCRIPT, homeThreads, target)
}