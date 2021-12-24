# BitBurner scripts

Some scripts for the game [Bitburner](https://store.steampowered.com/app/1812820/Bitburner/) ([web version](https://danielyxie.github.io/bitburner/)).

## Summary

* Continuously create "WGWH" (Weaken, Grow, Weaken, Hack) script sequence, targeting only the most profitable server, based on a metric.
* Grow, hack, weak scripts are minimal - to allow maximum threads.
* Calculate polling sleep time-out of each script, such that they all run concurrently but finish in close sequence with one another.

## Getting Started

* Copy scripts to your home (root directory)
* `run start.js` -
* It will `run get-target.js` which will print an optimal server.
* `run run.js [target]`, where `[target]` is the name of the server returned above.

## Usage

### Adjust Settings

* Edit the `SETTINGS` const in `shared.js`

```js
export const SETTINGS = {
    /**
     * Reserve ram at home
		 * Minimum to run `run.js` + `killall.js`
		 *
		 * Override if needed to increase free ram.
     */
    HOME_RESERVED_RAM: 5.45 + 2.25,
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
    MONEY_SAFETY_TRESH: 0.5,
    /**
     * Duration of polling, in milliseconds.
     */
    POLL: 1000,
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
	* But the Deeplink programs as you can afford it.
	* Buy QoL programs if you want.
	* Join factions and purchase augments needed.
	* Upgrade home ram (up, until you feel you no longer need it any more - or when you go over 100 processes on the home server).
	* Upgrade home cpu (may not be necessary?).
	* Buy additional servers to use, if you need more ram and you currently can not afford upgrading home ram.
		* Use `purchase-servers.js` to a single server with the largest amount of ram you can afford.
	* Once augments get too expensive, install augments and start again.
* Try and keep below 100 running scripts per server (there might be a game technical reason for it?).

## To Do

* Comments and descriptions.
* Investigate improving server target value/priority formula.