import { GAME_CONSTANTS, getScriptRam, getServers, PORT, SCRIPT, setQueue, SETTINGS, stringify } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
    // ns.disableLog('ALL')

    const lastKnown = {
        // serverName: {
        //     securityLevel: 0,
        //     moneyAvailable: 0,
        // }
    }

    const usable = getServers(ns).filter(s => s.hasRootAccess && s.maxRam > 0).sort((a, b) => b.maxRam - a.maxRam)

    let poll = 0
    while (true) {
        await ns.sleep(poll)

        const player = ns.getPlayer()

        let target

        if (SETTINGS.SPECIFIC_TARGET) {
            // Configured to target this specific server.
            target = SETTINGS.SPECIFIC_TARGET
        } else {
            // Get the profitable server, based on the above metric.
            target = getServers(ns)
                .filter(t => {
                    if (t.maxMoney <= 0) return false
                    if (!t.hasRootAccess) return false
                    if (t.name === GAME_CONSTANTS.HOME) return false
                    if (t.requiredHackingLevel > player.hacking) return false
                    if (ns.hackAnalyzeChance(t.name) === 0) return false

                    return true
                })
                .map(t => {
                    let value = t.maxMoney * ns.hackAnalyzeChance(t.name) * ns.hackAnalyze(t.name) * t.serverGrowth
                    value = value / t.minSecurityLevel
                    // value = value / (ns.getGrowTime(target.name) + ns.getHackTime(target.name) + ns.getWeakenTime(target.name))

                    t.value = value
                    return t
                })
                .reduce((t, ts) => ts.value > t.value ? ts : t, targets[0])
        }


        // When the full WGWH is successful, set this as the next lastKnown values for the next time.
        let lastKnownWorking = {}

        if (lastKnown[target.name]) {
            lastKnownWorking = {...lastKnown[target.name]}
        } else {
            lastKnownWorking = {
                securityLevel: ns.getServerSecurityLevel(target.name),
                moneyAvailable: ns.getServerMoneyAvailable(target.name),
            }
        }

        // Do WGWH.
        const weaken1 = getWeaken(target, lastKnownWorking)
        lastKnownWorking.securityLevel = target.minSecurityLevel

        const grow = getGrow(target, lastKnownWorking, ns)
        lastKnownWorking.securityLevel += grow.securityIncrease
        lastKnownWorking.moneyAvailable = target.maxMoney

        const weaken2 = getWeaken(target, lastKnownWorking)
        lastKnownWorking.securityLevel = target.minSecurityLevel

        const hack = getHack(target, ns)
        lastKnownWorking.moneyAvailable = target.maxMoney * SETTINGS.MONEY_THRESH
        lastKnownWorking.securityLevel += hack.securityIncrease

        const pollDiffs = getPollDifferences([
            ns.getWeakenTime(target.name),
            ns.getGrowTime(target.name),
            ns.getWeakenTime(target.name),
            ns.getHackTime(target.name),
        ])
        weaken1.poll = pollDiffs[0]
        grow.poll = pollDiffs[1]
        weaken2.poll = pollDiffs[2]
        hack.poll = pollDiffs[3]

        const scripts = [weaken1, grow, weaken2, hack]
        let canExec = true
        const execServers = []
        for (let script of scripts) {
            if (!canExec) break

            let reqThreads = script.threads
            for (let server of usable) {
                if (reqThreads <= 0) break
                let threads = 0

                const threadsAvailable = Math.floor((server.maxRam - ns.getServerUsedRam(server.name)) / getScriptRam(script.script))

                if (threadsAvailable === 0) continue
                else if (threadsAvailable > reqThreads) threads = reqThreads
                else threads = threadsAvailable

                if (threads > 0) {
                    execServers.push({ script: script.script, server: server.name, threads, poll: script.poll })
                    reqThreads -= threads
                }
            }

            canExec = reqThreads <= 0
        }

        if (canExec) {
            for (let i = 0; i < execServers.length; i++) {
                const element = execServers[i]
                const random = Math.random() // Add a random number so the running script is unique
                ns.exec(element.script, element.server, element.threads, target.name, element.poll, random)
            }

            lastKnown[target.name] = lastKnownWorking
        }

        poll = SETTINGS.POLL * (scripts.length + 1)
    }
}


/** @param {NS} ns **/
const getGrow = (target, lastKnown, ns) => {
    const script = SCRIPT.GROW
    const growDiffPct = target.maxMoney / lastKnown.moneyAvailable

    const threads = Math.ceil(ns.growthAnalyze(target.name, growDiffPct))
    const securityIncrease = ns.growthAnalyzeSecurity(threads)

    return {
        script,
        securityIncrease,
        threads,
    }
}

/** @param {NS} ns **/
const getWeaken = (target, lastKnown) => {
    const script = SCRIPT.WEAKEN
    const weakenDiff = lastKnown.securityLevel - target.minSecurityLevel
    const threads = Math.ceil(weakenDiff / GAME_CONSTANTS.WEAKEN_THREAD_ANALYZE)

    return {
        script,
        threads,
    }
}

/** @param {NS} ns **/
const getHack = (target, ns) => {
    const script = SCRIPT.HACK
    const moneyMinimum = target.maxMoney * SETTINGS.MONEY_THRESH
    const hackDiff = target.maxMoney - moneyMinimum
    const threads = Math.floor(ns.hackAnalyzeThreads(target.name, hackDiff))
    const securityIncrease = ns.hackAnalyzeSecurity(threads)

    return {
        script,
        securityIncrease,
        threads,
    }
}

const getPollDifferences = (polls) => {
    const maxPoll = polls.reduce((m, p) => m < p ? p : m, 0)
    return polls.map((p, i) => maxPoll - p + (i * SETTINGS.POLL))
}