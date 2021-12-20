# BitBurner scripts

Some scripts for the game [Bitburner](https://store.steampowered.com/app/1812820/Bitburner/) ([web version](https://danielyxie.github.io/bitburner/)).

## Summary

The main idea is to split up scripts so that the ones that benefit from threading are as small as possible (to allow maximum threads).

Separate out scripts that run constantly from scripts that only need to be run once/infrequently, or manually. The scripts that run constantly should take as little ram as possible, in order to maximum the number of threads.

It initializes by first getting all the server info and writing it to a JSON text file, so it does not have to use the `ns` methods each time.

## Getting Started

* First, download/copy `./src/download.js` to a js/ns file within Bitburner and run it, in order to download the rest of the scripts.
  * Manual: Copy the files in the `src` git folder (ignore scripts in the `src/archive` folder) to `home` Bitburner, using the same file names.
* `run init.js --deploy` to get initial config, stored in `config.txt` and then deploy scripts to all available servers.
* `run nuker.js` to exploit and nuke any un-nuked servers
* `run controller.js` function to do the main hacking.

## Usage

### Adjust Settings

Edit the constants at the top of `init.js`; Some useful things to adjust:
  * `threshMoney`: Lower value means it will take more money at once but is overall less optimal; Vice-versa for a higher value.
  * `threshSecurity`: Lower value means it will hack less at once but is overall more optimal; Vice-versa for a higher value.
  * `threshTarget`: Will ignore targets that are below this percentage of the maximum target value
    * Lower values provides higher thread throughput, however...
    * Possibly higher money returns if this value is higher, due to having more free threads for higher value targets than using them on lower level ones.
    * "Value" (determined in `init.js`) is currently determined by the max-money multipied by hack chance and money returned from a single thread, divided by the sum of all operation times, for that server.
    * Play around with this, and also with the value calculation.
  * `homeReserved`: Adjust as needed; Set to 0 if you don't need to reserve ram at home; Recommended to reserve the value of `mem killall.js`, at the very least (for convenient killing all runnin scripts).
    * If none is reserved, you must manually kill `controller.js` before you can `run killall.js`

Edit the constants at the top of `controller.js`; Some useful things to adjust:
  * `pollDelay`: Adds extra delay when polling; Acts as the minimum. May decrease for better spead at the expense of some stability (?)
    * Play around with this.
  * `queueMaxLength`: Will attempt to keep the queue under this length; If the queue goes over this length, it will wait for a timestamp further along in the queue.
    * Play around with this.

### Kill All Running Scripts

`run killall.js`

### Refreshing The Config

Kill all running scripts (`run killall.js`) and then re-run `run init.js`. Next, run `run nuker.js` to nuke new un-nuked servers.
This should be done whenever:
* You want to refresh the servers based on your currently available servers and tools.
* You want to update your hacking level or server ram/cores.

## To Do

* More descriptions and comments
* Additional scripts, depending on game progression
* Improve / try out different target ranking formula?