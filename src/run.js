import { GAME_CONSTANTS, getScriptRam, getScriptTime, getServers, hasFormulasExe, SCRIPT, SETTINGS, stringify, updatePlayerExp } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog('ALL')
    ns.tail('run.js', GAME_CONSTANTS.HOME, ...ns.args)

    const flags = ns.flags([
        ['grow', false]
    ])

    let serverObj = null
    let playerObj = null

    let target = getServers(ns).filter(s => s.name === ns.args[0])
    target = target[0]
    if (!target) throw new Error('Please specify the target server name as the argument.')

    if (SETTINGS.MONEY_SAFETY_THRESH >= SETTINGS.MONEY_THRESH) throw new Error('MONEY_SAFETY_THRESH must be below MONEY_THRESH.')

    if (hasFormulasExe(ns)) {
        serverObj = ns.getServer(target.name)
        playerObj = ns.getPlayer()
    }

    const usable = getServers(ns).filter(s => s.hasRootAccess && s.maxRam > 0).sort((a, b) => b.maxRam - a.maxRam)

    // GW until max money and min security, then hack via HWGW.
    ns.tprint('GW started.')
    const gwReturn = await gwLoop(ns, target, usable, serverObj, playerObj)
    serverObj = gwReturn.serverObj
    playerObj = gwReturn.playerObj
    // killall(ns)

    if (flags.grow) {
        ns.tprint('Stopped: Only grow.')
        return
    }

    if (serverObj) {
        serverObj.moneyAvailable = serverObj.moneyMax
        serverObj.hackDifficulty = serverObj.minDifficulty
    }
    ns.tprint('GW finished; HWGW started.')
    await hwgwLoop(ns, target, usable, gwReturn.gwEndTimestamp, serverObj, playerObj)
}

/** @param {NS} ns **/
const gwLoop = async (ns, target, usable, serverObj, playerObj) => {

    const moneyAvailable = ns.getServerMoneyAvailable(target.name)
    const securityLevel = ns.getServerSecurityLevel(target.name)

    const reqThreads = {}
    reqThreads[SCRIPT.GROW] = getReqGrowThreads(target, moneyAvailable, ns)
    reqThreads[SCRIPT.WEAKEN] = getReqWeakenThreads(target, securityLevel + ns.growthAnalyzeSecurity(reqThreads[SCRIPT.GROW]), serverObj, playerObj)

    // Timestamp when the GW loop ends.
    // The HWGW should not check the money safety threshold until after this timestamp.
    let gwEndTimestamp = 0
    let gwStartTimestamp = 0

    let poll = 0
    while (true) {
        await ns.sleep(poll)
        poll = SETTINGS.POLL

        if (reqThreads[SCRIPT.GROW] <= 0 && reqThreads[SCRIPT.WEAKEN] <= 0) return { gwEndTimestamp, serverObj, playerObj, }

        let exec = []
        if (reqThreads[SCRIPT.GROW] > 0) {
            exec.push({
                script: SCRIPT.GROW,
                scriptRam: getScriptRam(SCRIPT.GROW),
                scriptTime: getScriptTime(ns, SCRIPT.GROW, target.name, serverObj, playerObj),
                threads: reqThreads[SCRIPT.GROW]
            })
        }
        if (reqThreads[SCRIPT.WEAKEN] > 0) {
            exec.push({
                script: SCRIPT.WEAKEN,
                scriptRam: getScriptRam(SCRIPT.WEAKEN),
                scriptTime: getScriptTime(ns, SCRIPT.WEAKEN, target.name, serverObj, playerObj),
                threads: reqThreads[SCRIPT.WEAKEN],
            })
        }

        const polls = getPolls(exec.map(e => e.scriptTime))

        exec = exec.map((e, i) => {
            e.poll = polls[i] + SETTINGS.POLL
            return e
        })

        for (const queued of exec) {
            for (const server of usable) {
                if (queued.threads <= 0) break

                const threads = getScriptServerThreads(ns, server, queued.threads, queued.scriptRam)

                if (threads > 0) {
                    ns.exec(queued.script, server.name, threads, target.name, queued.poll, Math.random())
                    playerObj = updatePlayerExp(ns, serverObj, playerObj, threads)
                    reqThreads[queued.script] -= threads

                    const scriptEndTimestamp = Date.now() + queued.scriptTime + queued.poll
                    if (scriptEndTimestamp > gwEndTimestamp) gwEndTimestamp = scriptEndTimestamp
                    if (!gwStartTimestamp) gwStartTimestamp = scriptEndTimestamp
                }
            }
        }

        ns.clearLog()
        ns.print('GW')
        printStatus(ns, target)
        const startingTimer = gwStartTimestamp - Date.now()
        if (startingTimer > 0) ns.print(`START ${ns.tFormat(startingTimer)}`)
    }
}

/** @param {NS} ns **/
const hwgwLoop = async (ns, target, usable, gwEndTimestamp, serverObj, playerObj) => {
    const safetyMoney = target.maxMoney * SETTINGS.MONEY_SAFETY_THRESH

    let initialHackThreads = 0
    let hwgwTimestamp = gwEndTimestamp

    while (true) {
        await ns.sleep(SETTINGS.POLL)

        const moneyAvailable = ns.getServerMoneyAvailable(target.name)

        // Kill all if it currently goes below the safety money threshold.
        if (Date.now() > gwEndTimestamp && moneyAvailable < safetyMoney) {
            ns.run('killall.js')
            throw new Error(`Stopped: Went below ${SETTINGS.MONEY_SAFETY_THRESH} money threshold.`)
        }

        const hwgw = [
            { script: SCRIPT.HACK, scriptRam: getScriptRam(SCRIPT.HACK), scriptTime: getScriptTime(ns, SCRIPT.HACK, target.name, serverObj, playerObj), },
            { script: SCRIPT.WEAKEN, scriptRam: getScriptRam(SCRIPT.WEAKEN), scriptTime: getScriptTime(ns, SCRIPT.WEAKEN, target.name, serverObj, playerObj), },
            { script: SCRIPT.GROW, scriptRam: getScriptRam(SCRIPT.GROW), scriptTime: getScriptTime(ns, SCRIPT.GROW, target.name, serverObj, playerObj), },
            { script: SCRIPT.WEAKEN, scriptRam: getScriptRam(SCRIPT.WEAKEN), scriptTime: getScriptTime(ns, SCRIPT.WEAKEN, target.name, serverObj, playerObj), }
        ]

        // Determine polling.
        const polls = getPolls(hwgw.map(h => h.scriptTime))

        // First determine the money threshold so that all our servers can currently accomodate an entire batch.
        let moneyThresh = SETTINGS.MONEY_THRESH
        let exec = []
        while (moneyThresh < 1 && exec.length === 0) {
            let h0Threads = getReqHackThreads(target, moneyThresh, ns, serverObj, playerObj)
            // Do not go above the initial hack thread count.
            if (!initialHackThreads) initialHackThreads = h0Threads
            else if (h0Threads > initialHackThreads) h0Threads = initialHackThreads
            // If the available money is somehow going down, reduce hack threads to recover.
            // h0Threads = Math.floor(h0Threads / hgRecoverRate)

            const w1Threads = getReqWeakenThreads(target, target.minSecurityLevel + ns.hackAnalyzeSecurity(h0Threads))
            let g2Threads = getReqGrowThreads(target, target.maxMoney * moneyThresh, ns)
            // If the available money is somehow going down, increase growth threads to recover.
            // g2Threads = Math.ceil(g2Threads * hgRecoverRate)

            const w3Threads = getReqWeakenThreads(target, target.minSecurityLevel + ns.growthAnalyzeSecurity(g2Threads))

            const reqThreads = [h0Threads, w1Threads, g2Threads, w3Threads]
            const workingExec = []
            for (let i = 0; i < hwgw.length; i++) {
                const script = hwgw[i]

                for (const server of usable) {
                    if (reqThreads[i] <= 0) break

                    const threads = getScriptServerThreads(ns, server, reqThreads[i], script.scriptRam)

                    if (threads > 0) {
                        workingExec.push({
                            ...script,
                            server: server.name,
                            threads,
                            target: target.name,
                            poll: polls[i] + SETTINGS.POLL + (SETTINGS.POLL / polls.length) // Extra, to delay the batch from the previous.
                        })
                        reqThreads[i] -= threads
                    }
                }
            }

            // There are threads required that are left over; Increase the money threshold and retry.
            if (reqThreads.find(rq => rq > 0)) {
                moneyThresh += 0.01
            }
            // All threads of the batch is able to fit.
            else {
                exec = workingExec
            }
        }

        // Then execute them on the servers
        if (exec.length > 0) {
            for (const queued of exec) {
                ns.exec(queued.script, queued.server, queued.threads, queued.target, queued.poll, Math.random())
                playerObj = updatePlayerExp(ns, serverObj, playerObj, queued.threads)

                const scriptEndTimestamp = Date.now() + queued.scriptTime + queued.poll
                if (!hwgwTimestamp) hwgwTimestamp = scriptEndTimestamp
            }

            // const timestamps = exec
            //     .map(e => Date.now() + getScriptTime(ns, e.script, target.name) + e.poll)
            //     .sort((a, b) => a - b)
            //     .map(e => new Date(e).toLocaleTimeString())

            // ns.tprint(stringify(timestamps))
        }

        ns.clearLog()
        ns.print('HWGW')
        printStatus(ns, target)
        const startingTimer = hwgwTimestamp - Date.now()
        if (startingTimer > 0) ns.print(`START ${ns.tFormat(startingTimer)}`)
    }
}

/** @param {NS} ns **/
const getReqGrowThreads = (target, moneyAvailable, ns) => {
    const growDiffPct = target.maxMoney / moneyAvailable
    return Math.ceil(ns.growthAnalyze(target.name, growDiffPct))
}

/**
 *
 * @param {*} target
 * @param {*} moneyThresh If the batch takes too much threads, increase this;
 * - Should stop creating batches if this goes over a certain threshold, to avoid creating 1-threaded hack batches
 * @param {NS} ns
 * @returns
 */
const getReqHackThreads = (target, moneyThresh, ns, serverObj, playerObj) => {
    if (serverObj && playerObj) {
        const pctToHack = 1 - moneyThresh
        const oneThread = ns.formulas.hacking.hackPercent(serverObj, playerObj)
        return Math.floor(pctToHack / oneThread)
    }

    const moneyMinimum = target.maxMoney * moneyThresh
    const hackDiff = target.maxMoney - moneyMinimum
    return Math.floor(ns.hackAnalyzeThreads(target.name, hackDiff))
}

/** @param {NS} ns **/
const getReqWeakenThreads = (target, securityLevel) => {
    const weakenDiff = securityLevel - target.minSecurityLevel
    return Math.ceil(weakenDiff / GAME_CONSTANTS.WEAKEN_THREAD_ANALYZE)
}

/** @param {NS} ns **/
const getScriptServerThreads = (ns, server, threadsReq, scriptRam) => {
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

const getPolls = (polls) => {
    const scriptInterval = SETTINGS.POLL / polls.length // One batch to fit within a poll.
    const maxPoll = polls.reduce((m, p) => m < p ? p : m, 0)
    return polls.map((p, i) => maxPoll - p + (i * scriptInterval))
}