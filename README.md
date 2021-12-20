# BitBurner scripts

Some scripts for the game [Bitburner](https://store.steampowered.com/app/1812820/Bitburner/) ([web version](https://danielyxie.github.io/bitburner/)).

## Summary

Main idea is to split up scripts so that the ones that benefit from threading are as small as possible (to allow maximum threads).

Separate out scripts that run constantly from scripts that only need to be run once, or manually.

Initializes by first getting all the server info and writing it to a JSON text file, so it does not have to use the `ns` methods each time.

## Usage

* Copy the files in the `src` git folder (ignore scripts in the `src/archive` folder) to `home` BitBurner, using the same file names
* Run `init.js --deploy` to get initial config, stored in `config.txt` and then deploy scripts.
  * Use `deploy.js` to deploy the scripts manually, without running `init.js`
  * Run `init.js --clean` to remove existing files from all servers and kill all running scripts.
* Run `nuker.js` to exploit and nuke any un-nuked servers
* Run `controller.js` function to do the main hacking.
* Run `killall.js` to kill all running scripts on all servers and home
  * Run `cleanup-kill.js` to the same as above, in addition to also removing all files on remote servers, as well as the `config.txt` on the home server.

## To Do

* More descriptions and comments
* Additional scripts, depending on game progression
* Maybe find better target ranking formula?