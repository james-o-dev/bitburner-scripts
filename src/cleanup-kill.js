/** @param {NS} ns **/
export async function main(ns) {
	const { servers } = JSON.parse(ns.read('config.txt'))

	const hasFiles = servers.filter(s => s.name !== 'home' && s.ls.length > 0)
	for(let server of hasFiles) {
		ns.killall(server.name)

		for(let file of server.ls) {
			ns.rm(file, server.name)
		}
	}

	ns.run('init.js')
}