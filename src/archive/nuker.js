// Add any servers to exclude from nuking.
const exclusions = [
  'darkweb',
  'home',
]

/** @param {NS} ns **/
export async function main(ns) {
  const { servers, tools } = JSON.parse(await ns.read('config.txt'))

  const nukable = servers.filter(s => s.canHack && !s.hasRootAccess && !exclusions.includes(s.name))
  ns.tprint('Nukable: ' + nukable.length)

  for (let server of nukable) {
    const serverName = server.name
    if (tools.includes('BruteSSH.exe')) ns.brutessh(serverName)
    if (tools.includes('FTPCrack.exe')) ns.ftpcrack(serverName)
    if (tools.includes('HTTPWorm.exe')) ns.httpworm(serverName)
    if (tools.includes('relaySMTP.exe')) ns.relaysmtp(serverName)
    if (tools.includes('SQLInject.exe')) ns.sqlinject(serverName)

    ns.nuke(serverName)
    ns.tprint('Nuked: ' + serverName)
  }

  // Re-run init.js
  ns.run('init.js')
}