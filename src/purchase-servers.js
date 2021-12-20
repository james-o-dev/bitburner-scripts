/** @param {NS} ns **/
export async function main(ns) {
  const maxLimit = ns.getPurchasedServerLimit() - ns.getPurchasedServers().length

  for (let i = 0; i < maxLimit; i++) {
      const ram = getMaxAffordable(ns)
      if (ram) {
          const cost = ns.getPurchasedServerCost(ram)
          const server = ns.purchaseServer(`pserv${Math.random()}`, ram)
          ns.tprint(`Purchased ${server} | ${ns.nFormat(ram, '0,0')} | ${ns.nFormat(cost, '0,0')}`)
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