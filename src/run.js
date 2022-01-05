import { GAME_CONSTANTS, getScriptServerThreads, getScriptTime, getServers, getUsableServers, kill, SCRIPT, SETTINGS, stringify } from 'shared.js'


// Set this to true to print warnings to the terminal.
const PRINT_TERMINAL_WARNINGS = false

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog('ALL')
    ns.tail('run.js', GAME_CONSTANTS.HOME, ...ns.args)

    const flags = ns.flags([
        ['grow', false]
    ])

    let target = getServers(ns).filter(s => s.name === ns.args[0])
    target = target[0]
    if (!target) throw new Error('Please specify the target server name as the argument.')

    const usable = getUsableServers(ns)

    // GW until max money and min security, then hack via HWGW.
    ns.tprint('GW started.')
    const gwReturn = await gwLoop(ns, target, usable)
    if (flags.grow) {
        ns.tprint('Stopped: Only grow.')
        return
    }
    ns.tprint('GW finished; HWGW started.')
    await hwgwLoop(ns, target, usable, gwReturn.gwEndTimestamp)
}

/** @param {NS} ns **/
const gwLoop = async (ns, target, usable) => {

    const moneyAvailable = ns.getServerMoneyAvailable(target.name)
    const securityLevel = ns.getServerSecurityLevel(target.name)

    const reqThreads = {}
    reqThreads[SCRIPT.GROW] = getReqGrowThreads(target, ns, moneyAvailable)
    reqThreads[SCRIPT.WEAKEN] = getReqWeakenThreads(target, securityLevel + ns.growthAnalyzeSecurity(reqThreads[SCRIPT.GROW]))

    // Timestamp when the GW loop ends.
    // The HWGW should not do the "recovery" mechanic until after this timestamp.
    let gwEndTimestamp = 0
    // For logging timer until start.
    let gwStartTimestamp = 0

    let poll = 0
    while (true) {
        await ns.sleep(poll)
        poll = SETTINGS.POLL

        if (reqThreads[SCRIPT.GROW] <= 0 && reqThreads[SCRIPT.WEAKEN] <= 0) return { gwEndTimestamp }

        let exec = []
        if (reqThreads[SCRIPT.GROW] > 0) {
            exec.push({
                script: SCRIPT.GROW,
                scriptTime: getScriptTime(ns, SCRIPT.GROW, target.name),
                threads: reqThreads[SCRIPT.GROW]
            })
        }
        if (reqThreads[SCRIPT.WEAKEN] > 0) {
            exec.push({
                script: SCRIPT.WEAKEN,
                scriptTime: getScriptTime(ns, SCRIPT.WEAKEN, target.name),
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

                const threads = getScriptServerThreads(ns, server, queued.threads, queued.script)

                if (threads > 0) {
                    ns.exec(queued.script, server.name, threads, target.name, queued.poll, Math.random())
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
const hwgwLoop = async (ns, target, usable, gwEndTimestamp) => {
    const minMoney = target.maxMoney * SETTINGS.MONEY_THRESH

    let initialHackThreads = 0
    let hwgwTimestamp = gwEndTimestamp

    let runningHacks = []

    while (true) {
        await ns.sleep(SETTINGS.POLL)

        // Remove already elapsed hacks.
        runningHacks = runningHacks.filter(f => f.timestamp > Date.now())
        // Must remove any out of sync hacks (Grow and Weaken can stay).
        runningHacks = removeOutOfSyncHacks(ns, runningHacks)

        const moneyAvailable = ns.getServerMoneyAvailable(target.name)

        // "Recovery" mechanic.
        // To recover from out-of-sync
        if (Date.now() > gwEndTimestamp && moneyAvailable < minMoney) {
            // Remove the next N hacks and continue.
            if (PRINT_TERMINAL_WARNINGS) ns.tprint(`WARNING: Went below ${SETTINGS.MONEY_THRESH} money threshold.`)
            const hacksToRemove = 2
            for (let i = 0; i < hacksToRemove; i++) {
                const hackToRemove = runningHacks.shift()
                if (hackToRemove) {
                    const killed = kill(ns, hackToRemove.pid, ...hackToRemove.args)
                    if (PRINT_TERMINAL_WARNINGS && killed) ns.tprint('A hack was removed in order to recover.')
                }
            }
        }

        const hwgw = [
            { script: SCRIPT.HACK, scriptTime: getScriptTime(ns, SCRIPT.HACK, target.name), },
            { script: SCRIPT.WEAKEN, scriptTime: getScriptTime(ns, SCRIPT.WEAKEN, target.name), },
            { script: SCRIPT.GROW, scriptTime: getScriptTime(ns, SCRIPT.GROW, target.name), },
            { script: SCRIPT.WEAKEN, scriptTime: getScriptTime(ns, SCRIPT.WEAKEN, target.name), }
        ]

        // Determine polling.
        const polls = getPolls(hwgw.map(h => h.scriptTime))

        // First determine the money threshold so that all our servers can currently accomodate an entire batch.
        let moneyThresh = SETTINGS.MONEY_THRESH
        let exec = []
        while (moneyThresh < 1 && exec.length === 0) {
            let h0Threads = getReqHackThreads(target, moneyThresh, ns)
            // Do not go above the initial hack thread count.
            if (!initialHackThreads) initialHackThreads = h0Threads
            else if (h0Threads > initialHackThreads) h0Threads = initialHackThreads

            const w1Threads = getReqWeakenThreads(target, target.minSecurityLevel + ns.hackAnalyzeSecurity(h0Threads))
            const g2Threads = getReqGrowThreads(target, ns, target.maxMoney * moneyThresh)
            const w3Threads = getReqWeakenThreads(target, target.minSecurityLevel + ns.growthAnalyzeSecurity(g2Threads))

            const reqThreads = [h0Threads, w1Threads, g2Threads, w3Threads]
            const workingExec = []
            for (let i = 0; i < hwgw.length; i++) {
                const script = hwgw[i]

                for (const server of usable) {
                    if (reqThreads[i] <= 0) break

                    const threads = getScriptServerThreads(ns, server, reqThreads[i], script.script)

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
                const args = [queued.target, queued.poll, Math.random()]
                const pid = ns.exec(queued.script, queued.server, queued.threads, ...args)

                if (pid) {
                    const scriptEndTimestamp = Date.now() + queued.scriptTime + queued.poll
                    if (!hwgwTimestamp) hwgwTimestamp = scriptEndTimestamp

                    if (queued.script === SCRIPT.HACK) {
                        runningHacks.push({
                            pid,
                            timestamp: scriptEndTimestamp,
                            server: queued.server,
                            args,
                        })
                    }
                }
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
        ns.print(`HACKS QUEUED ${runningHacks.length}`)
    }
}

/** @param {NS} ns **/
const getReqGrowThreads = (target, ns, moneyAvailable) => {
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
const getReqHackThreads = (target, moneyThresh, ns) => {
    return Math.floor((1 - moneyThresh) / ns.hackAnalyze(target.name))
}

const getReqWeakenThreads = (target, securityLevel) => {
    const weakenDiff = securityLevel - target.minSecurityLevel
    return Math.ceil(weakenDiff / GAME_CONSTANTS.WEAKEN_THREAD_ANALYZE)
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

/**
 * @param {NS} ns
 * @param {Object[]} runningHacks
 * @returns
 */
const removeOutOfSyncHacks = (ns, runningHacks) => {
    const synced = []

    // Remove elements via "Stalin sort".

    let nextHackExpected = 0 // Next hack expected to be at or after this timestamp.
    for (let i = 0; i < runningHacks.length; i++) {
        const element = runningHacks[i]

        // Hack script somehow snuck in between the poll setting.
        if (nextHackExpected && element.timestamp < nextHackExpected) {
            const killed = kill(ns, element.pid, ...element.args)
            if (killed) {
                if (PRINT_TERMINAL_WARNINGS) ns.tprint('WARNING: Killed an out-of-sync hack.')
                continue
            }
        }
        // The next in-sync hack.
        else {
            nextHackExpected = element.timestamp + SETTINGS.POLL
            synced.push(element)
        }
    }

    return synced
}