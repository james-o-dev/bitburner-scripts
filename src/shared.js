export const SETTINGS = {
    /**
     * Override to reserve ram at home
     * By default, reserve total ram of `run.js` + `killall.js`
     */
    HOME_RESERVED_RAM: null,
    /**
     * Percentage of the max server money to stay above; Will not take money if below this percentage.
     * Increase: If you do not have enough threads, for a full WGWH.
     * Decrease: If you have threads to spare.
     *
     * Warning: Setting this too low may cause the HWGW script be less efficient, due to the calculation (it has to cancel hack threads to recover).
     */
    MONEY_THRESH: 0.9,
    /**
     * Duration of polling, in milliseconds.
     * Increase polling rate for stability (may avoid batches becoming out of sync and taking more money than it should).
     * Decrease for max profitz.
     *
     * Thoughts: Polling depends on the HGW time of the server
     * If the HGW is high, this should be increased (since more batches will accumulate on the servers before the scripts are run and cleared)
     * If the HGW is low, this can be decreased (less batches accumulated before the scripts run)
     */
    POLL: 4000,
    /**
     * Toast (bottom-right pop-up) duration, in milliseconds - adjust if needed, if it is too slow/fast.
     */
    TOAST_DURATION: 4000,
}

export const SCRIPT = {
    EARLY_SCRIPT: 'early-script.js',
    GROW: 'grow.js',
    HACK: 'hack.js',
    KILLALL: 'killall.js',
    RUN: 'run.js',
    SHARED: 'shared.js',
    WEAKEN: 'weaken.js',
}
export const SCRIPT_RAM = {
    EARLY_SCRIPT: 2.75,
    GROW: 1.7,
    HACK: 1.7,
    KILLALL: 2.25,
    WEAKEN: 1.75,
}

export const FILES = {
    ...SCRIPT,
    SERVERS: 'servers.txt',
}

export const GAME_CONSTANTS = {
    /**
     * Currently, grow time is WEAKEN_TIME x GROW_TIME_MULTI
     * - This may change in the future...
     */
    GROW_TIME_MULTI: 0.8,
    /**
     * Currently, hack time is WEAKEN_TIME x HACK_TIME_MULTI
     * - This may change in the future...
     */
    HACK_TIME_MULTI: 0.25,
    HOME: 'home',
    NULL_PORT: 'NULL PORT DATA',
    WEAKEN_THREAD_ANALYZE: 0.05,
}

/** @param {NS} ns **/
export function getServers(ns) {
    const serverString = ns.read(FILES.SERVERS)
    if (!serverString) throw new Error('run start.js first')
    return JSON.parse(serverString)
}

/** @param {NS} ns **/
export function killall(ns) {
    getServers(ns)
        .filter(s => s.name !== GAME_CONSTANTS.HOME)
        .forEach(({ name }) => ns.killall(name))
}

/** @param {NS} ns **/
export function kill(ns, scriptOrPid, args) {
    getServers(ns)
        .filter(s => s.name !== GAME_CONSTANTS.HOME)
        .forEach(({ name }) => ns.kill(scriptOrPid, name, ...args))
}

export const stringify = (obj) => JSON.stringify(obj, null, 2)

export const getScriptRam = (script) => {
    switch (script) {
        case SCRIPT.EARLY_SCRIPT:
            return SCRIPT_RAM.EARLY_SCRIPT
        case SCRIPT.GROW:
            return SCRIPT_RAM.GROW
        case SCRIPT.HACK:
            return SCRIPT_RAM.HACK
        case SCRIPT.KILLALL:
            return SCRIPT_RAM.KILLALL
        case SCRIPT.WEAKEN:
            return SCRIPT_RAM.WEAKEN
    }
}

/** @param {NS} ns **/
export const getScriptTime = (ns, script, server) => {
    const weakenTime = ns.getWeakenTime(server)

    switch (script) {
        case SCRIPT.GROW:
            return weakenTime * GAME_CONSTANTS.GROW_TIME_MULTI

        case SCRIPT.HACK:
            return weakenTime * GAME_CONSTANTS.HACK_TIME_MULTI

        case SCRIPT.WEAKEN:
            return weakenTime
    }
}

/** @param {NS} ns **/
export const hasFormulasExe = (ns) => ns.fileExists('Formulas.exe')

export const timestampToTimeString = (timestamp) => new Date(timestamp).toLocaleTimeString()

/** @param {NS} ns **/
export const getUsableServers = (ns) => getServers(ns).filter(s => s.hasRootAccess && s.maxRam > 0).sort((a, b) => b.maxRam - a.maxRam)

/** @param {NS} ns **/
export const getScriptServerThreads = (ns, server, threadsReq, script) => {
    if (threadsReq <= 0) return 0
    const scriptRam = getScriptRam(script)
    const threadsAvailable = Math.floor((server.maxRam - ns.getServerUsedRam(server.name)) / scriptRam)
    const threads = threadsAvailable > threadsReq ? threadsReq : threadsAvailable
    return threads < 0 ? 0 : threads
}