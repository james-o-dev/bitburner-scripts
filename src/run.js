import { GAME_CONSTANTS, getScriptRam, getScriptTime, getServers, killall, SCRIPT, SETTINGS, stringify } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog('ALL')
    ns.tail('run.js', GAME_CONSTANTS.HOME, ns.args[0])

    let target = getServers(ns).filter(s => s.name === ns.args[0])
    target = target[0]
    if (!target) throw new Error('Please specify the target server name as the argument.')

    const usable = getServers(ns).filter(s => s.hasRootAccess && s.maxRam > 0).sort((a, b) => b.maxRam - a.maxRam)

    let lastKnown = {
        moneyAvailable: ns.getServerMoneyAvailable(target.name),
        securityLevel: ns.getServerSecurityLevel(target.name),
        timestamp: 0,
    }

    while (true) {
        // WG until max money and min security, then hack via WGWH.
        const wgLoopReturn = await wgLoop(ns, target, lastKnown, usable)
        killall(ns)
        lastKnown = wgLoopReturn.lastKnown
        lastKnown.moneyAvailable = target.maxMoney
        lastKnown.securityLevel = target.minSecurityLevel

        // WGWH to hack, until it needs to re-grow the server via WG.
        const wgwhLoopReturn = await wgwhLoop(ns, target, lastKnown, usable)
        killall(ns)
        lastKnown = wgwhLoopReturn.lastKnown
        lastKnown.moneyAvailable = ns.getServerMoneyAvailable(target.name)
        lastKnown.securityLevel = ns.getServerSecurityLevel(target.name)
    }
}

/** @param {NS} ns **/
const wgLoop = async (ns, target, lastKnown, usable) => {

    const startMessage = getStartPrint(ns, target, false)

    // GW until max money and min security.
    const wg = [0, 0]

    while (true) {
        const moneyAvailable = ns.getServerMoneyAvailable(target.name)
        lastKnown.moneyAvailable = moneyAvailable
        const securityLevel = ns.getServerSecurityLevel(target.name)

        // Finished with WG.
        if (moneyAvailable === target.maxMoney && securityLevel <= target.minSecurityLevel) return { lastKnown }

        await ns.sleep(SETTINGS.POLL)

        if (wg[0] <= 0 && wg[1] <= 0) {
            wg[0] = getReqWeakenThreads(lastKnown, target)
            lastKnown.securityLevel = target.minSecurityLevel

            wg[1] = getReqGrowThreads(lastKnown, target, ns)
            lastKnown.securityLevel += ns.growthAnalyzeSecurity(wg[1])
        }

        let script = ''
        let wgIdx = -1
        if (wg[0] > 0) {
            script = SCRIPT.WEAKEN
            wgIdx = 0
        } else if (wg[1] > 0) {
            script = SCRIPT.GROW
            wgIdx = 1
        } else {
            continue
        }

        const exec = execOnServers(ns, usable, target, script, wg[wgIdx], lastKnown.timestamp)
        lastKnown.timestamp = exec.scriptEndTimestamp
        wg[wgIdx] -= exec.threadsUsed

        ns.clearLog()
        ns.print('WG')
				const timeToStart = startMessage.startTime - Date.now()
				if (timeToStart > 0) ns.print(ns.tFormat(timeToStart))
        printStatus(ns, target)
        ns.print(stringify(wg))
    }
}

/** @param {NS} ns **/
const wgwhLoop = async (ns, target, lastKnown, usable) => {

    const startMessage = getStartPrint(ns, target, true)

    // Do WGWH cycle.
    const wgwh = [0, 0, 0, 0]
    while (true) {
        await ns.sleep(SETTINGS.POLL)

        if (SETTINGS.MONEY_SAFETY_TRESH >= SETTINGS.MONEY_THRESH) throw new Error('MONEY_SAFETY_TRESH must be below MONEY_THRESH.')
        const moneyAvailable = ns.getServerMoneyAvailable(target.name)
        const safetyMoney = target.maxMoney * SETTINGS.MONEY_SAFETY_TRESH

        // Needs to re-grow via WG
        if (moneyAvailable < safetyMoney) {
            // ns.run('killall.js')
            // throw new Error(`Stopped: Went below ${SETTINGS.MONEY_SAFETY_TRESH} money threshold.`)
            return { lastKnown }
        }

        if (wgwh[0] <= 0 && wgwh[1] <= 0 && wgwh[2] <= 0 && wgwh[3] <= 0) {
            wgwh[0] = getReqWeakenThreads(lastKnown, target)
            lastKnown.securityLevel = target.minSecurityLevel

            wgwh[1] = getReqGrowThreads(lastKnown, target, ns)
            lastKnown.securityLevel += ns.growthAnalyzeSecurity(wgwh[1])

            wgwh[2] = getReqWeakenThreads(lastKnown, target)
            lastKnown.securityLevel = target.minSecurityLevel

            wgwh[3] = getReqHackThreads(target, ns)
            lastKnown.securityLevel += ns.hackAnalyzeSecurity(wgwh[3])
            lastKnown.moneyAvailable = target.maxMoney * SETTINGS.MONEY_THRESH
        }

        let script = ''
        let wgwhIdx = -1
        if (wgwh[0] > 0) {
            script = SCRIPT.WEAKEN
            wgwhIdx = 0
        } else if (wgwh[1] > 0) {
            script = SCRIPT.GROW
            wgwhIdx = 1
        } else if (wgwh[2] > 0) {
            script = SCRIPT.WEAKEN
            wgwhIdx = 2
        } else if (wgwh[3] > 0) {
            script = SCRIPT.HACK
            wgwhIdx = 3
        } else {
            continue
        }

        const exec = execOnServers(ns, usable, target, script, wgwh[wgwhIdx], lastKnown.timestamp)
        lastKnown.timestamp = exec.scriptEndTimestamp
        wgwh[wgwhIdx] -= exec.threadsUsed

        ns.clearLog()
        ns.print('WGWH')
				const timeToStart = startMessage.startTime - Date.now()
				if (timeToStart > 0) ns.print(ns.tFormat(timeToStart))
        printStatus(ns, target)
        ns.print(stringify(wgwh))
    }
}

/** @param {NS} ns **/
const getReqGrowThreads = (lastKnown, target, ns) => {
		const growMulti = 2 // For extra caution...
    const growDiffPct = target.maxMoney / lastKnown.moneyAvailable
    return Math.ceil(ns.growthAnalyze(target.name, growDiffPct) * growMulti)
}

/** @param {NS} ns **/
const getReqHackThreads = (target, ns) => {
    const moneyMinimum = target.maxMoney * SETTINGS.MONEY_THRESH
    const hackDiff = target.maxMoney - moneyMinimum
    return Math.floor(ns.hackAnalyzeThreads(target.name, hackDiff))
}

const getReqWeakenThreads = (lastKnown, target) => {
    const weakenDiff = lastKnown.securityLevel - target.minSecurityLevel
    return Math.ceil(weakenDiff / GAME_CONSTANTS.WEAKEN_THREAD_ANALYZE)
}

/** @param {NS} ns **/
const execOnServers = (ns, usableServers, target, script, reqThreads, lastTimestamp) => {
    const scriptRam = getScriptRam(script)

    let scriptEndTimestamp = Date.now() + getScriptTime(ns, script, target.name)
    let scriptPoll = 0
    let threadsUsed = 0

    // If it will finish before the last timestamp: add extra poll time so that it finishes after, in order to maintain the order.
    if (scriptEndTimestamp < lastTimestamp) scriptPoll = lastTimestamp - scriptEndTimestamp

    scriptPoll += SETTINGS.POLL
    scriptEndTimestamp += scriptPoll

    // Check available servers.
    for (let server of usableServers) {
        if (reqThreads <= 0) break

        const threads = getUsableServerThreads(ns, server, reqThreads, scriptRam)

        if (threads > 0) {
            ns.exec(script, server.name, threads, target.name, scriptPoll, Math.random())
            reqThreads -= threads
            threadsUsed += threads
        }
    }

    return {
        scriptEndTimestamp: scriptEndTimestamp,
        threadsUsed,
    }
}

/** @param {NS} ns **/
const getUsableServerThreads = (ns, server, threadsReq, scriptRam) => {
    if (threadsReq <= 0) return 0

    const threadsAvailable = Math.floor((server.maxRam - ns.getServerUsedRam(server.name)) / scriptRam)

    const threads = threadsAvailable > threadsReq ? threadsReq : threadsAvailable

    return threads < 0 ? 0 : threads
}

/** @param {NS} ns **/
const printStatus = (ns, target) => {
    const moneyAvailable = ns.getServerMoneyAvailable(target.name)
    const securityLevel = ns.getServerSecurityLevel(target.name)
    const nFormat = '$0,0'

    const securityDiff = securityLevel - target.minSecurityLevel

    ns.print(`SECURITY: ${securityLevel} / ${target.minSecurityLevel} (${securityDiff})`)
    ns.print(`MONEY: ${ns.nFormat(moneyAvailable, nFormat)} / ${ns.nFormat(target.maxMoney, nFormat)} (${Math.round((moneyAvailable / target.maxMoney) * 100)}%)`)
}

/** @param {NS} ns **/
const getStartPrint = (ns, target, includeHack = false) => {
    const startPoll = Math.max(
        getScriptTime(ns, SCRIPT.GROW, target.name),
        getScriptTime(ns, SCRIPT.WEAKEN, target.name),
				includeHack ? getScriptTime(ns, SCRIPT.HACK, target.name) : 0
    )
		const startTime = Date.now() + startPoll + SETTINGS.POLL
    const startTimestamp = new Date(Date.now() + startPoll + SETTINGS.POLL).toLocaleTimeString()

    return {
			message: `Start: ${new Date(startTimestamp).toLocaleTimeString()}`,
			startTime,
		}
}

// const getPollDifferences = (polls) => {
//     const maxPoll = polls.reduce((m, p) => m < p ? p : m, 0)
//     return polls.map((p, i) => maxPoll - p + (i * SETTINGS.POLL))
// }