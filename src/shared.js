export const SETTINGS = {
	HOME_RESERVED_RAM: 8,
	MONEY_THRESH: 0.65,
	POLL_MAX: 6000,
	POLL_MIN: 2000,
	SECURITY_THRESH: 0,
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