# BitBurner scripts

Some scripts for the game [Bitburner](https://store.steampowered.com/app/1812820/Bitburner/) ([web version](https://danielyxie.github.io/bitburner/)).

## Summary

* Continuously create "HWGW" (Hack, Weaken, Grow, Weaken) script sequence, targeting only the most profitable server, based on a metric.
* Grow, hack, weak scripts are minimal - to allow maximum threads.
* Calculate polling sleep time-out of each script, such that they all run concurrently but finish in order, inclose sequence with one another.

## Getting Started

* Copy scripts to your home (root directory)
* `run start.js`; It will `run get-target.js` which will print an optimal server.
* `run run.js [target]`, where `[target]` is the name of the server returned above.

## Usage

### Adjust Settings

* Edit the `SETTINGS` const in `shared.js`

```js
export const SETTINGS = {
    /**
     * Override to reserve ram at home
		 * By default, reserve total ram of `run.js` + `killall.js`
     */
    HOME_RESERVED_RAM: null,
    /**
     * Percentage of the max server money to stay above; Will not take money if below this percentage.
     * Increase: If you do not have enough threads, for a full WGWH.
     * Decrease: If you have threads to spare.
     */
    MONEY_THRESH: 0.9,
    /**
     * If the money gets below this threshold WHILE the script is running, it will terminate.
     * Note: Only check while the run script is running - it does not accomodate changes that will happen after already existing scripts.
     * 0 = disabled
     */
    MONEY_SAFETY_THRESH: 0.9 / 2,
    /**
     * Duration of polling, in milliseconds.
		 * Increase polling rate for stability (may avoid batches becoming out of sync and taking more money than it should).
		 * - Also increase to keep ram usage lower and keep under 100 threads per server
		 * Decrease for max profitz.
		 *
		 * Thoughts: Polling depends on the HGW time of the server
		 * If the HGW is high, this should be increased (since more batches will accumulate on the servers before the scripts are run and cleared)
		 * If the HGW is low, this can be decreased (less batches accumulated before the scripts run)
     */
		 POLL: 3000,
    /**
     * Toast (bottom-right pop-up) duration, in milliseconds - adjust if needed, if it is too slow/fast.
     */
    TOAST_DURATION: 4000,
}
```

### Kill All Running Scripts

Use `run killall.js`; Requires `run start.js` first, at least once per game start-up.

This kills all running scripts on all servers, including home.

### Refreshing servers

Run `run start.js` again.

Necessary if you have purchased new servers or port-opening tools.

## Tips

* My personal priority:
	* Buy enough home ram to run all the scripts.
	* `buy` TOR router.
	* `buy` the port-opening programs as you can afford it.
	* `buy` the Deeplink programs as you can afford it.
	* `buy` QoL programs if you want.
	* Join factions and purchase augments needed.
	* Upgrade home ram (up, until you feel you no longer need it any more - or when you go over 100 processes on the home server).
	* Upgrade home cpu (may not be necessary?).
		* Buy additional servers to use, if you need more ram and you currently can not afford upgrading home ram.
		* Use `purchase-servers.js` to a single server with the largest amount of ram you can afford.
	* `buy` Formula.exe
	* Once augments get too expensive, install augments and start again.
* Try and keep below 100 running scripts per server (there might be a game technical reason for it?).
	* Increase the `SETTINGS.POLL` to decrease the maximum running scripts, at the expense of profit.

## To Do

* HWGW sometimes becomes out of sync (taking below the money safety threshold) and exits... :(
* Comments and descriptions.
* Investigate improving server target value/priority formula.