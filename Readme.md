# item_ids

A program to fetch the item ids of steam items that are needed to use the buyorder API.

## Usage:
```
usage: load.js [-h] appId {both,names,ids}

positional arguments:
  appId             App ID of the game
  {both,names,ids}  What data should be loaded

optional arguments:
  -h, --help        show this help message and exit
```

Results will get stored in the `data` folder.

*Speed: ~ 240 ids/h*
