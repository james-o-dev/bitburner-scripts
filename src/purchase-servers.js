const flagsConfig = [
  ['dry-run', false],
  ['limit', 1]
]

/** @param {NS} ns **/
export async function main(ns) {
  const flags = ns.flags(flagsConfig)
  const limit = flags.limit

  const maxLimit = ns.getPurchasedServerLimit() - ns.getPurchasedServers().length

  for (let i = 0; i < maxLimit; i++) {
    if (i > limit - 1) break

    const ram = getMaxAffordable(ns)
    if (ram) {
      const cost = ns.getPurchasedServerCost(ram)
      const ramf = `${ns.nFormat(ram, '0,0')}GB`

      if (flags['dry-run']) {
        ns.tprint(`DRY-RUN: MAX ${ramf} | COST ${ns.nFormat(cost, '$0,0.00')}`)
        return
      }

      const server = ns.purchaseServer(`pserv${Math.random()}`, ram)
      ns.tprint(`Purchased ${server} | ${ramf} | ${ns.nFormat(cost, '$0,0.00')}`)
    }
  }
}

/** @param {NS} ns **/
const getMaxAffordable = (ns) => {
  const money = ns.getPlayer().money

  for (let i = 20; i >= 0; i--) {
    const ram = Math.pow(2, i)
    const cost = ns.getPurchasedServerCost(ram)

    if (cost <= money) {
      return ram
    }
  }
}