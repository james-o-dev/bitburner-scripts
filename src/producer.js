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

                let value = target.maxMoney * ns.hackAnalyzeChance(target.name) * ns.hackAnalyze(target.name)
                value = value / (ns.getGrowTime(target.name) + ns.getHackTime(target.name) + ns.getWeakenTime(target.name))

                if (value > maxValue) maxValue = value

                const bundle = {
                    target: target.name,
                    value,
                    scripts: []
                }

                if (ns.getServerMoneyAvailable(target.name) < target.maxMoney) {
                    // If less than max money - get to max money, with WGW.

                    // Weaken to min.
                    const weakenThreads1 = getWeakenThreads(ns, target)

                    // Grow to max.
                    const growThreads = getGrowThreads(ns, target)

                    // Weaken to min.
                    const weakenThreads2 = getWeakenThreads(ns, target, true, growThreads.securityIncrease)

                    // Get polling differences, so that they finish close together.
                    const polls = getPollDifferences([
                      ns.getWeakenTime(target.name),
                      ns.getGrowTime(target.name),
                      ns.getWeakenTime(target.name),
                    ])
                    weakenThreads1.poll = polls[0]
                    growThreads.poll = polls[1]
                    weakenThreads2.poll = polls[2]

                    // Add to the bundle.
                    bundle.scripts.push(weakenThreads1)
                    bundle.scripts.push(growThreads)
                    bundle.scripts.push(weakenThreads2)

                } else if (ns.getServerSecurityLevel(target.name) > target.minSecurityLevel + SETTINGS.SETTINGS) {
                    // Else if less than min security - reduce to min security, with W

                    // Weaken to min.
                    const weakenThreads = getWeakenThreads(ns, target, true)
                    bundle.scripts.push(weakenThreads)

                } else {
                    // Do a cycle for HWGW.

                    // Hack to threshold.
                    const hackThreads = getHackThreads(ns, target)

                    // Weaken to min.
                    const weakenThreads1 = getWeakenThreads(ns, target, false, hackThreads.securityIncrease)

                    // Grow to max.
                    const growThreads = getGrowThreads(ns, target)

                    // Weaken to min.
                    const weakenThreads2 = getWeakenThreads(ns, target, true, growThreads.securityIncrease)

                    // Get polling differences, so that they finish close together.
                    const polls = getPollDifferences([
                        ns.getHackTime(target.name),
                        ns.getWeakenTime(target.name),
                        ns.getGrowTime(target.name),
                        ns.getWeakenTime(target.name),
                    ])
                    hackThreads.poll = polls[0]
                    weakenThreads1.poll = polls[1]
                    growThreads.poll = polls[2]
                    weakenThreads2.poll = polls[3]

                    // Add to the bundle.
                    bundle.scripts.push(hackThreads)
                    bundle.scripts.push(weakenThreads1)
                    bundle.scripts.push(growThreads)
                    bundle.scripts.push(weakenThreads2)
                }

                return bundle
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
    const moneyAvailable = ns.getServerMoneyAvailable(target.name)
    const moneyDiff = moneyAvailable - moneyMinimum
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
    const delay = 2000
    const maxPoll = polls.reduce((m, p) => m < p ? p : m, 0)
    return polls.map((p, i) => maxPoll - p + (i * delay))
}