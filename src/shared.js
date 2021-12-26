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
     */
    MONEY_THRESH: 0.75,
    /**
     * If the money gets below this threshold WHILE the script is running, it will terminate.
     * Note: Only check while the run script is running - it does not accomodate changes that will happen after already existing scripts.
     * 0 = disabled
     */
    MONEY_SAFETY_TRESH: 0.75 / 2,
    /**
     * Duration of polling, in milliseconds.
		 * Increase polling rate for stability (may avoid batches becoming out of sync and taking more money than it should).
		 * - Also increase to keep ram usage lower and keep under 100 threads per server
		 * Decrease for max profitz.
		 *
		 * Thoughts: Polling depends on the HGW time of the server
		 * If the HGW is high, this should be increased (since more batches will accumulate on the servers before the scripts are run and cleared)
		 * If the HGW is low, this can be decreased (less batches accumulated before the scripts run)
     */
		 POLL: 3000,
    /**
     * Toast (bottom-right pop-up) duration, in milliseconds - adjust if needed, if it is too slow/fast.
     */
    TOAST_DURATION: 4000,
}

export const SCRIPT = {
    GROW: 'grow.js',
    HACK: 'hack.js',
		KILLALL: 'killall.js',
    RUN: 'run.js',
    SHARED: 'shared.js',
    WEAKEN: 'weaken.js',
}
export const SCRIPT_RAM = {
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

export const stringify = (obj) => JSON.stringify(obj, null, 2)

export const getScriptRam = (script) => {
    switch (script) {
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
    switch (script) {
        case SCRIPT.GROW:
            return ns.getGrowTime(server)

        case SCRIPT.HACK:
            return ns.getHackTime(server)

        case SCRIPT.WEAKEN:
            return ns.getWeakenTime(server)
    }
}