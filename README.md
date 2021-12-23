# BitBurner scripts

Some scripts for the game [Bitburner](https://store.steampowered.com/app/1812820/Bitburner/) ([web version](https://danielyxie.github.io/bitburner/)).

## Summary

* "Pub + Sub" system: Involves two polling loops - one to "produce orders" and one to "consume orders".
* Grow, hack, weak scripts are minimal - to allow maximum threads.

## Getting Started

* Copy scripts to your home (root directory)
* `run start.js`

## Usage

### Adjust Settings

* Edit the `SETTINGS` const in `shared.js`

```js
export const SETTINGS = {
    /**
     * mem run.js + mem killall.js
     * 10.2 + 2.1
     *
     * Override if needed to increase free ram.
     */
    HOME_RESERVED_RAM: 10.2 + 2.1, // + more
    /**
     * Percentage of the max server money to stay above; Will not take money if below this percentage
     * Increase if you have total threads to spare
     * Decrease if total threads are at capacity
     *
     * It is more efficient to have this higher, so we do not take too much money and increase the server security level too much.
     *
     * Note: It is better to have some total threads spare, in order to respond to higher-valued targets, rather than them being used for lower-valued targets
     */
    MONEY_THRESH: 0.9,
    /**
     * Duration of polling, in milliseconds.
     */
    POLL: 2000,
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

* Running the full script requires at least 10.2GB ram (Extra 2.1GB if you want to `run killall.js`)
	* If you don't have enough, just run a smaller script in the beginning to get money to upgrade your home ram to this amount.
		You may use `early-hack-template.script` from the [Bitburner docs](https://bitburner.readthedocs.io/en/latest/guidesandtips/gettingstartedguideforbeginnerprogrammers.html#editing-our-hacking-script), or another more efficent script in the mean-time
* My personal priority:
	* Buy enough home ram to run all the scripts
	* `buy` TOR router.
	* `buy` the port-opening programs as you can afford it.
	* But the Deeplink programs as you can afford it.
	* Buy QoL programs if you want.
	* Join factions and purchase augments needed.
	* Upgrade home ram up to a point (until you think you can run all needed threads for all servers).
	* Upgrade home cpu (may not be necessary?).
	* Buy additional servers to use, if you need more ram and you currently can not afford upgrading home ram.
		* Use `purchase-servers.js` to a single server with the largest amount of ram you can afford.
	* Once augments get too expensive, install augments and start again.

## To Do

* Comments and descriptions.
* Investigate improving server target value/priority formula, if .
* Investigate improving polling and timing.