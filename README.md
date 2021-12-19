# BitBurner scripts

Some scripts for the game [Bitburner](https://store.steampowered.com/app/1812820/Bitburner/) ([web version](https://danielyxie.github.io/bitburner/)).

## Summary

Main idea is to split up scripts so that the ones that benefit from threading are as small as possible (to allow maximum threads).

Separate out scripts that run constantly from scripts that only need to be run once, or manually.

Initializes by first getting all the server info and writing it to a JSON text file, so it does not have to use the `ns` methods each time.

## Usage

* Copy the files in the `src` git folder (ignore scripts in the `src/archive` folder) to `home` BitBurner, using the same file names
* Run `init.js --deploy` to get initial config, stored in `config.txt` and then deploy scripts.
  * Run `init.js --clean` to remove existing files from all servers and kill all running scripts.
  * Add/remove your available tools to the `tools` string array
* Run `nuker.js` to explot and nuke any un-nuked servers
* Run the `controller.js` function to do the main hacking.
  * Writes to the script log but also writes to `log.txt`
* Run `killall.js` to kill all running scripts in all servers and home
  * Run `cleanup-kill.js` to the same as above, in addition to also removing all files.

## To Do

* More descriptions and comments
* Additional scripts, depending on game progression
* Maybe find better target ranking formula
* How to use `ns.weakenAnalyze()` properly??