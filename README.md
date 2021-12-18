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

# TODO