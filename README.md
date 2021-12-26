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

### Acquiring target server

`run get-target.js [n] [t]` returns the top profitable server/s to hack, based on metric specified in the script

Where `[n]` is the number of top servers to return and if `[t]` is true/truthy, include timing in the equation (mainly go get servers for testing purposes).

Example:
```js
run get-target.js // Get top valuable server.
run get-target.js 3 // Get top 3 valuable servers.
run get-target.js 3 true // Get top 3 valuable servers, taking into account the timing (the results may be different from the above).
```

Currently, the `run.js` script is only designed to target one server at a time - since if it goes below the safety money threshold, it will `run killall.js`, killing all other instances. Therefore, it is better to target the most valuable server.

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
     * Decrease for max profitz.
     *
     * Thoughts: Polling depends on the HGW time of the server
     * If the HGW is high, this should be increased (since more batches will accumulate on the servers before the scripts are run and cleared)
     * If the HGW is low, this can be decreased (less batches accumulated before the scripts run)
     */
    POLL: 4000,
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

## FAQ

### The scripts become out of sync!

To be investigated - but for now, you can try increase `MONEY_THRESH` (higher, in order to allow more time for the "recovery" function to kick in) and `POLL` (try to be at least 4000) settings.

Note however that this will reduce your profit.

Also, make sure there are no other scripts targeting the target server, before `run run.js`.

## Tips

* My personal priority:
	* Buy enough home ram to run all the scripts.
	* `buy` TOR router.
	* `buy` the port-opening programs as you can afford it.
	* `buy` the Deeplink programs as you can afford it.
	* `buy` QoL programs if you want.
	* Join factions and purchase augments needed.
	* Upgrade home ram when you can afford it
	* Upgrade home cpu (may not be necessary?).
		* Buy additional servers to use, if you need more ram and you currently can not afford upgrading home ram.
		* Use `purchase-servers.js` to a single server with the largest amount of ram you can afford.
	* `buy` Formula.exe
	* Once augments get too expensive, install augments and start again.

## To Do

* HWGW sometimes becomes out of sync (taking below the money safety threshold) and exits... :(
* Comments and descriptions.
* Investigate improving server target value/priority formula.