import { doPolling, GAME_CONSTANTS, getQueue, getServers, PORT, SCRIPT, setQueue, SETTINGS, stringify } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog('ALL')
    ns.tail('producer.js')

    ns.clearPort(PORT.QUEUE_READY)
    ns.clearPort(PORT.QUEUE_RUNNING)

    while (true) {
        await doPolling(ns)

        const player = ns.getPlayer()

        const readyQueue = getQueue(ns, PORT.QUEUE_READY)
        const runningQueue = getQueue(ns, PORT.QUEUE_RUNNING)

        let maxValue = 0
        const targets = getServers(ns)
            .filter(t => {

                if (t.maxMoney <= 0) return false
                if (!t.hasRootAccess) return false
                if (t.name === GAME_CONSTANTS.HOME) return false
                if (t.requiredHackingLevel > player.hacking) return false
                if (ns.hackAnalyzeChance(t.name) === 0) return false

                return true
            })
            .map(target => {
                let value = target.maxMoney * ns.hackAnalyzeChance(target.name) * ns.hackAnalyze(target.name) * target.serverGrowth
                value = value / target.minSecurityLevel
                value = value / (ns.getGrowTime(target.name) + ns.getHackTime(target.name) + ns.getWeakenTime(target.name))

                if (value > maxValue) maxValue = value

                // Do a cycle for WGWH.

                // Weaken to min.
                const weakenThreads1 = getWeakenThreads(ns, target, false)

                // Grow to max.
                const growThreads = getGrowThreads(ns, target)

                // Weaken to min.
                const weakenThreads2 = getWeakenThreads(ns, target, false, growThreads.securityIncrease)

                // Hack to threshold.
                const hackThreads = getHackThreads(ns, target, true)

                // Get polling differences, so that they finish close together.
                const polls = getPollDifferences([
                    ns.getWeakenTime(target.name),
                    ns.getGrowTime(target.name),
                    ns.getWeakenTime(target.name),
                    ns.getHackTime(target.name),
                ])
                weakenThreads1.poll = polls[0]
                growThreads.poll = polls[1]
                weakenThreads2.poll = polls[2]
                hackThreads.poll = polls[3]

                const scripts = [
                    weakenThreads1,
                    growThreads,
                    weakenThreads2,
                    hackThreads,
                ]

                return {
                    scripts,
                    target: target.name,
                    value,
                }
            })
            .filter(nrq => {
                if (nrq.value < (maxValue * SETTINGS.VALUE_THRESH)) return false
                if (readyQueue.find(rq => rq.target === nrq.target)) return false
                if (runningQueue.find(t => t === nrq.target)) return false
                return true
            })

        let newReadyQueue = [...readyQueue, ...targets]
            .sort((a, b) => b.value - a.value)
        // .filter((_, i) => !SETTINGS.MAX_TARGETS || (i < SETTINGS.MAX_TARGETS))

        await setQueue(ns, PORT.QUEUE_READY, newReadyQueue)

        ns.clearLog()
        ns.print(stringify(readyQueue))
        ns.print(`READY: ${readyQueue.length}`)
    }
}


/** @param {NS} ns **/
const getGrowThreads = (ns, target, last = false) => {
    const script = SCRIPT.GROW
    const moneyAvailable = ns.getServerMoneyAvailable(target.name)
    const growthDiff = target.maxMoney / moneyAvailable
    const threads = Math.ceil(ns.growthAnalyze(target.name, growthDiff))
    const securityIncrease = ns.growthAnalyzeSecurity(threads)

    return {
        last, // If it is the last script to finish executing, it must remove the target from the running queue.
        poll: 0,
        script,
        securityIncrease,
        threads,
    }
}

/** @param {NS} ns **/
const getWeakenThreads = (ns, target, last = false, securityIncrease = 0, ) => {
    const script = SCRIPT.WEAKEN
    const serverSecurityLevel = ns.getServerSecurityLevel(target.name)
    const weakenDiff = serverSecurityLevel + securityIncrease - target.minSecurityLevel
    const threads = Math.ceil(weakenDiff / GAME_CONSTANTS.WEAKEN_THREAD_ANALYZE)

    return {
        last, // If it is the last script to finish executing, it must remove the target from the running queue.
        poll: 0,
        script,
        threads,
    }
}

/** @param {NS} ns **/
const getHackThreads = (ns, target, last = false) => {
    const script = SCRIPT.HACK
    const moneyMinimum = target.maxMoney * SETTINGS.MONEY_THRESH
    const moneyDiff = target.maxMoney - moneyMinimum
    const threads = Math.ceil(ns.hackAnalyzeThreads(target.name, moneyDiff))
    const securityIncrease = ns.hackAnalyzeSecurity(threads)

    return {
        last, // If it is the last script to finish executing, it must remove the target from the running queue.
        poll: 0,
        script,
        securityIncrease,
        threads,
    }
}

const getPollDifferences = (polls) => {
    const staggerDelay = 3000
    const maxPoll = polls.reduce((m, p) => m < p ? p : m, 0)
    return polls.map((p, i) => maxPoll - p + (i * staggerDelay))
}