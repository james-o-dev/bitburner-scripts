import { doPolling, getQueue, getServers, getScriptRam, PORT, setQueue, stringify } from 'shared.js'

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog('ALL')
    ns.tail('consumer.js')

    ns.clearPort(PORT.QUEUE_RUNNING)

    const usable = getServers(ns).filter(s => s.hasRootAccess && s.maxRam > 0).sort((a, b) => b.maxRam - a.maxRam)
    const totalMaxRam = usable.reduce((t, u) => t + u.maxRam, 0)

    while (true) {
        await doPolling(ns)

        let readyQueue = getQueue(ns, PORT.QUEUE_READY)
        let runningQueue = getQueue(ns, PORT.QUEUE_RUNNING)

        for (let i = 0; i < readyQueue.length; i++) {
            const ramAlreadyUsed = usable.reduce((t, u) => t + ns.getServerUsedRam(u.name), 0)
            const totalUsableRam = Math.floor(totalMaxRam - ramAlreadyUsed)

            let queued = readyQueue[i]

            const { target, scripts, } = queued

            const ramRequired = scripts.reduce((rr, s) => rr + (getScriptRam(s.script) * s.threads), 0)

            // First it must check if our servers have enough ram this target.
            // TODO quick and dirty solution; Find a better one.
            if (totalUsableRam < ramRequired) continue

            // If it does we can execute the scripts.
            let scriptsToExec = [...scripts]
            for (let ii = 0; ii < scriptsToExec.length; ii++) {
                const script = scriptsToExec[ii];

                let reqThreads = script.threads
                for (let server of usable) {
                    if (reqThreads <= 0) break
                    let threads = 0

                    const threadsAvailable = Math.floor((server.maxRam - ns.getServerUsedRam(server.name)) / getScriptRam(script.script))

                    if (threadsAvailable === 0) continue
                    else if (threadsAvailable > reqThreads) threads = reqThreads
                    else threads = threadsAvailable

                    if (threads > 0) {
                        ns.exec(script.script, server.name, threads, target, script.poll, script.last)
                        reqThreads = reqThreads - threads
                        scriptsToExec[ii] = null
                    }
                }

								if (reqThreads <= 0) scriptsToExec[ii] = null
            }

            if (scriptsToExec.filter(s => Boolean(s)).length === 0) {
                runningQueue.push(target)
                readyQueue[i] = null
            }
        }

        readyQueue = readyQueue.filter(rq => Boolean(rq)).sort((a, b) => b.value - a.value)
        await setQueue(ns, PORT.QUEUE_READY, readyQueue)

        ns.clearLog()
        await setQueue(ns, PORT.QUEUE_RUNNING, runningQueue)
        ns.print(stringify(runningQueue))
        ns.print(`RUNNING: ${runningQueue.length}`)
    }
}