/** @param {NS} ns **/
export async function main(ns) {
  const { servers, scripts } = JSON.parse(await ns.read('config.txt'))

  const usable = servers.filter(s => s.hasRootAccess)
  const scriptNames = scripts.map(s => s.name)

  for (let server of usable) {
      await ns.scp(scriptNames, 'home', server.name)
  }

  ns.run('init.js')
}