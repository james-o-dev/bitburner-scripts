export const SETTINGS = {
    /**
     * mem start.js + producer.js + killall.js
     * 7.15 + 6.5 + 2.1
     * (ignore consumer.js it does not run the same time as start.js and uses less ram)
     *
     * Override if needed to increase free ram.
     */
    HOME_RESERVED_RAM: 7.15 + 6.5 + 2.1, // + more
    /**
     * Percentage of the max server money to stay above; Will not take money if below this percentage
     * Increase if you have total threads to spare
     * Decrease if total threads are at capacity
     *
     * It is more efficient to have this higher, so we do not take too much money and increase the server security level too much.
     *
     * Note: It is better to have some total threads spare, in order to respond to higher-valued targets, rather than them being used for lower-valued targets
     */
    MONEY_THRESH: 0.75,
    /**
     * Maximum duration of polling, in milliseconds.
     * Polling time is random between the min and the max.
     */
    POLL_MAX: 6000,
    /**
     * Minimum duration of polling, in milliseconds.
     * Polling time is random between the min and the max.
     */
    POLL_MIN: 1000,
    /**
     * Leeway security level.
     * It will always try to hack to minimum security; However, this setting allows it to not always constantly use weaken.
     * Increase if you need to free more ram/threads, at the expense of hack efficiency
     */
    SECURITY_THRESH: 1,
    /**
     * Toast (bottom-right pop-up) duration, in milliseconds - adjust if needed, if it is too slow/fast.
     */
    TOAST_DURATION: 4000,
    /**
     * It will only target those with the top % percentage of value; Range 0 to 1.
     * i.e. If set to 1 - only the top most valuable target will be hacked
     * i.e. If set to 0 - all (non-zero value) targets will be hacked
     *
     * Adjust this depending on your progression:
     * Higher value if you do not have ram/threads to spare (e.g. at the beginning of the game or after augment)
     * Gradually lower this value to 0 as you have more threads you have spare, to allow more targets to be hacked.
     *
     * Note: It is better to have some total threads spare, in order to respond to higher value targets
     */
    VALUE_THRESH: 0,
}

export const PORT = {
    SERVERS: 11,
    QUEUE_READY: 12,
    QUEUE_RUNNING: 13,
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
export const MAX_SCRIPT_RAM = 1.75

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

export const doPolling = async (ns) => ns.sleep(Math.random() * (SETTINGS.POLL_MAX - SETTINGS.POLL_MIN) + SETTINGS.POLL_MIN)

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