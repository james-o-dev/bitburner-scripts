# BitBurner scripts

Some scripts for the game [Bitburner](https://store.steampowered.com/app/1812820/Bitburner/) ([web version](https://danielyxie.github.io/bitburner/)).

## Summary

* "Pub + Sub" system: Involves two polling loops - one to "produce orders" and one to "consume orders".
* Grow, hack, weak scripts are minimal - to allow maximum threads.

## Getting Started

* Copy scripts to your home (root directory)
* `run start.js --run`

## Usage

### Adjust Settings

* Edit the `SETTINGS` const in `shared.js`

```js
export const SETTINGS = {
	/**
	 * start.js + producer.js + killall.js
	 * * (ignore consumer.js it does not run the same time as start.js and uses less ram)
	 * 7.15 + 6.5 + 2.1 = 15.75
	 *
	 * Override if needed to increase free ram.
	 */
	HOME_RESERVED_RAM: 15.75,
	/**
	 * Percentage of the max server money to say above; Will not take money if below this percentage
	 * Increase if you have total threads to spare
	 * Decrease if total threads are at capacity
	 *
	 * Note: It is better to have some total threads spare, in order to respond to higher value targets
	 */
	MONEY_THRESH: 0.2,
	/**
	 * Max duration it should poll.
	 * Polling time is random between the min and the max.
	 */
	POLL_MAX: 6000,
	/**
	 * Min duration it should poll.
	 * Polling time is random between the min and the max.
	 */
	POLL_MIN: 1000,
	/**
	 * Leeway security level.
	 * It will always try to hack to minimum security; However, this setting allows it to not always constantly use weaken.
	 * Increase if you need to free more ram/threads, at the expense of hack efficiency
	 */
	SECURITY_THRESH: 2,
	/**
	 * Toast (bottom-right pop-up) duration, in milliseconds - adjust where needed.
	 */
	TOAST_DURATION: 4000,
	/**
	 * It will only target those with the top % percentage of value; Range 0 to 1.
	 * i.e. If set to 1 - only the top most valuable target will be hacked
	 * i.e. If set to 0 - all (non-zero value) targets will be hacked
	 *
	 * Adjust this depending on your progression:
	 * Higher value if you do ot have ram/threads to spare (e.g. at the beginning of the game or after augment)
	 * Gradually lower this value to 0 as you have more threads you have spare, to allow more targets to be hacked.
	 *
	 * Note: It is better to have some total threads spare, in order to respond to higher value targets
	 */
	VALUE_THRESH: 0,
}
```

### Kill All Running Scripts

Use `run killall.js`; Requires `run start.js` first, at least once a game start-up.

This kills all running scripts on all servers, including home.

## Tips

* Running the full script requires at least 15.75GB ram (Or 13.65GB if you don't need to `run killall.js`)
	* If you don't have enough, just run a smaller script in the beginning to get money to upgrade your home ram.
		You may use `early-hack-template.script` from the [Bitburner docs](https://bitburner.readthedocs.io/en/latest/guidesandtips/gettingstartedguideforbeginnerprogrammers.html#editing-our-hacking-script)
* My personal priority:
	* Buy enough home ram to run the scripts - in order to accomodate 15.75GB ram
	* Buy TOR router
	* `buy` the port-opening programs as you can afford it
	* But the Deeplink programs as you can afford it
	* Buy QoL programs if you want
	* Join factions and purchase augments needed
	* Upgrade home ram up to a point (typically until over 1 TB)
	* Upgrade home cpu
	* Once augments get too expensive, install augments and start again.

## To Do

* Comments and descriptions.
* Improving "value" formula.
* Investigate "batching" = do weaken, grow, hack in parallel.