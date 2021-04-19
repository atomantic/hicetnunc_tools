# Hic et Nunc Tools

Auditing, IPFS Pinning, and other tools for creators, collectors, and network support of Hic et Nunc.

The preference for this repo is to not have any npm module dependencies. The current versions of tools can be run as-is without installing any dependencies (other than Node.js) or using any API keys.

# Author

If you are using this, hit me up on Twitter: https://twitter.com/antic
And check out my works here: https://adameivy.com/gallery

# Setup

1. Git Clone this repository or download the release zip file
2. Make sure you have Node.js installed: http://nodejs.org
3. Run a tool

> Each tool has an accompanying shell script that you can edit to make a favorites list of multiple wallets you want to take actions on.

# List of Tools

## Creator Audit

Curious what items are for sale or available to be listed by a creator?
Want to manage your inventory and don't know what you have listed or that could be listed?

```
node audit.js tz1iyFi4WjSttoja7Vi1EJYMEKKSebQyMkF9
```

or edit `audit.sh` to add your own addresses and run like so:

```
./audit.sh
```

outputs something like so:

```
⚡ fetching creation info for address tz1iyFi4WjSttoja7Vi1EJYMEKKSebQyMkF9...
🚫 Sold Out:
https://www.hicetnunc.xyz/objkt/9354 0/25
https://www.hicetnunc.xyz/objkt/3007 0/1
https://www.hicetnunc.xyz/objkt/2299 0/1
https://www.hicetnunc.xyz/objkt/1444 0/2
https://www.hicetnunc.xyz/objkt/992 0/1
https://www.hicetnunc.xyz/objkt/990 0/1
https://www.hicetnunc.xyz/objkt/984 0/3
https://www.hicetnunc.xyz/objkt/980 0/1
https://www.hicetnunc.xyz/objkt/972 0/1
https://www.hicetnunc.xyz/objkt/971 0/1
https://www.hicetnunc.xyz/objkt/969 0/1
https://www.hicetnunc.xyz/objkt/957 0/10
✅ For Sale:
https://www.hicetnunc.xyz/objkt/11829 4/5
https://www.hicetnunc.xyz/objkt/11825 2/25
https://www.hicetnunc.xyz/objkt/9355 23/25
https://www.hicetnunc.xyz/objkt/9349 23/25
https://www.hicetnunc.xyz/objkt/8405 47/50
https://www.hicetnunc.xyz/objkt/8404 48/50
https://www.hicetnunc.xyz/objkt/8402 41/50
https://www.hicetnunc.xyz/objkt/6868 25/50
https://www.hicetnunc.xyz/objkt/6867 25/50
https://www.hicetnunc.xyz/objkt/6865 19/70
https://www.hicetnunc.xyz/objkt/3942 1/5
https://www.hicetnunc.xyz/objkt/3006 1/2
https://www.hicetnunc.xyz/objkt/1228 1/2
https://www.hicetnunc.xyz/objkt/1142 1/2
https://www.hicetnunc.xyz/objkt/996 1/2
https://www.hicetnunc.xyz/objkt/988 1/2
https://www.hicetnunc.xyz/objkt/967 40/52
🏷️  Owner Can List:
https://www.hicetnunc.xyz/objkt/11829 1/5
https://www.hicetnunc.xyz/objkt/11825 15/25
https://www.hicetnunc.xyz/objkt/8405 1/50
https://www.hicetnunc.xyz/objkt/8404 1/50
https://www.hicetnunc.xyz/objkt/8402 1/50
https://www.hicetnunc.xyz/objkt/6868 25/50
https://www.hicetnunc.xyz/objkt/6867 25/50
https://www.hicetnunc.xyz/objkt/6865 50/70
https://www.hicetnunc.xyz/objkt/3942 2/5
https://www.hicetnunc.xyz/objkt/3006 1/2
https://www.hicetnunc.xyz/objkt/1228 1/2
https://www.hicetnunc.xyz/objkt/1142 1/2
```

## IPFS Pin

Hic et Nunc (like most NFT platforms) stored the NFT data on IPFS. This is a network of decentralized file hosts. Every computer running an IPFS node is an edge caching server for the network as well as a host for specific (pinned) files. You can run your own website from IPFS if you like :)

There's a caveat with IPFS: If nobody is pinning a piece of content, it can expire from the network and be lost.

You can backup the Hic et Nunc platform (or just your own creations and collection, or that of your friends) by running an IPFS node and pinning the associated content.

This is a tool for pinning all of the creations and collections of a given tezos wallet.

1. Install and run IPFS: https://ipfs.io/#install
2. Pin collection/creations by wallet address:

```
node pin.js tz1iyFi4WjSttoja7Vi1EJYMEKKSebQyMkF9
```

or edit `pin.sh` to add your own addresses and run like so:

```
./pin.sh
```

> Note: This project contains a conseiljs version of IPFS pinning, which does not use the hicetnunc lambda endpoint. However, the conseil version requires a conseil API key.
>
> - the hicetnunc-api repo contains an API key: https://github.com/hicetnunc2000/hicetnunc-api/blob/master/conseilUtil.js#L10
> - rather than committing that key to this repo, this project uses an ENV var
> - get yourself a key on https://nautilus.cloud/home/keys (or use the key from the original repo)
> - add to your shell: `export CONSEIL_KEY=YOUR_KEY_VALUE`
> - This version also has node.js module dependencies: run `npm i`
>   then run `node pin.conseil.js tz1iyFi4WjSttoja7Vi1EJYMEKKSebQyMkF9`

## HENode

A full IPFS caching node for HEN.

Run like so:

```
node henode.js
```

or to only cache meta (not content, which could be HUGE):

```
node henode.js meta
```

State for the HENode is stored in `./.cache.json`. To reset your history (in case you want to switch from meta-only to full node), you can delete this file and restart the node to bootstrap from the start.
