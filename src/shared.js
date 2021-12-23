export const SETTINGS = {
    /**
     * mem run.js + mem killall.js
     * 10.2 + 2.1
     *
     * Override if needed to increase free ram.
     */
    HOME_RESERVED_RAM: 10.2 + 2.1, // + more
    /**
     * Percentage of the max server money to stay above; Will not take money if below this percentage.
     * Increase: If you do not have enough threads, for a full WGWH.
     * Decrease: If you have threads to spare.
     */
    MONEY_THRESH: 0.5,
    /**
     * Duration of polling, in milliseconds.
     */
    POLL: 2000,
    /**
     * Target this specific server;
     * By default, it will target the most profitable server, based on a metric.
     */
    SPECIFIC_TARGET: '',
    /**
     * Toast (bottom-right pop-up) duration, in milliseconds - adjust if needed, if it is too slow/fast.
     */
    TOAST_DURATION: 4000,
}

export const PORT = {
    SERVERS: 11,
}

export const SCRIPT = {
    GROW: 'grow.js',
    HACK: 'hack.js',
    SHARED: 'shared.js',
    WEAKEN: 'weaken.js',
}
export const SCRIPT_RAM = {
    GROW: 1.7,
    HACK: 1.7,
    WEAKEN: 1.75,
}

export const GAME_CONSTANTS = {
    HOME: 'home',
    NULL_PORT: 'NULL PORT DATA',
    WEAKEN_THREAD_ANALYZE: 0.05,
}

/** @param {NS} ns **/
export function getServers(ns) {
    const fromPort = getQueue(ns, PORT.SERVERS)
    if (fromPort.length === 0) throw new Error('run start.js first')
    return fromPort
}

/** @param {NS} ns **/
export function killall(ns) {
    getServers(ns)
        .filter(s => s.name !== GAME_CONSTANTS.HOME)
        .forEach(({ name }) => ns.killall(name))
}

export const stringify = (obj) => JSON.stringify(obj, null, 4)

/** @param {NS} ns **/
export const getQueue = (ns, port) => {
    let data = ns.peek(port)
    if (data === GAME_CONSTANTS.NULL_PORT) data = '[]'
    return JSON.parse(data)
}

/** @param {NS} ns **/
export const setQueue = (ns, port, queue = '[]') => {
    ns.clearPort(port)
    return ns.writePort(port, stringify(queue))
}

export const getScriptRam = (script) => {
    let scriptRam

    switch (script) {
        case SCRIPT.GROW:
            scriptRam = SCRIPT_RAM.GROW
            break;

        case SCRIPT.HACK:
            scriptRam = SCRIPT_RAM.HACK
            break;

        case SCRIPT.WEAKEN:
            scriptRam = SCRIPT_RAM.WEAKEN
            break;
    }

    return scriptRam
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