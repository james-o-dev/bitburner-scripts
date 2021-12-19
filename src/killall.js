const configFileName = 'config.txt'

/** @param {NS} ns **/
export async function main(ns) {
	const { servers } = JSON.parse(await ns.read(configFileName))
	servers.forEach(s => ns.killall(s.name))
	ns.killall('home')
}