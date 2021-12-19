/** @param {NS} ns **/
export async function main(ns) {
  const { servers, tools } = JSON.parse(await ns.read('config.txt'))

const nukable = servers.filter(s => s.canHack && !s.hasRootAccess)
ns.tprint('Nukable: ' + nukable.length)

for(let server of nukable) {
  const serverName = server.name
  if (tools.includes('BruteSSH.exe')) ns.brutessh(serverName)
  if (tools.includes('FTPCrack.exe')) ns.ftpcrack(serverName)

  ns.nuke(serverName)
  ns.tprint('Nuked: ' + serverName)
}

// Re-run init.js
ns.run('init.js')
}