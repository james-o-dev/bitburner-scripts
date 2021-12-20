# BitBurner scripts

Some scripts for the game [Bitburner](https://store.steampowered.com/app/1812820/Bitburner/) ([web version](https://danielyxie.github.io/bitburner/)).

## Summary

Main idea is to split up scripts so that the ones that benefit from threading are as small as possible (to allow maximum threads).

Separate out scripts that run constantly from scripts that only need to be run once/infrequently, or manually.

Initializes by first getting all the server info and writing it to a JSON text file, so it does not have to use the `ns` methods each time.

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
  * `homeReserved`: Adjust if you need; Set to 0 if you don't need to reserve and ram at home; Recommended to at least reserve the value of `mem killall.js`.
    * If none is reserved, you must manually kill `controller.js` before you can `run killall.js`

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
* Maybe find better target ranking formula?