# Prediction Market for Content Curation

This repository contains code of frontend & backend that supports the application [Prediction market for content curation on Twitter](https://social-prediction-market.vercel.app/).

The prediction market's L2 smart contract is deployed on Starknet (Starkware's L2 scaling sol for Ethereum) and is written in [cairo](http://cairo-lang.org). You can find them [here](https://github.com/Janmajayamall/PM-contracts).

## What's Prediction Market for Content Curation on twitter?

It's simple. It means using this app you can bet on twitter whether an account is spam/fake or not.

It is inspired by [Vitalik Buterin's post back in 2018](https://ethresear.ch/t/prediction-markets-for-content-curation-daos/1312)

## How does it work?

Under "Active markets" you will find accounts (markets) over which people are still betting to predict whether it is spam or not. After sometime, the markets are resolved if they reach sufficient volumes of bets in both direction. If a market fails to reach sufficient volume, then the market expires after a few days & users can get refund on their bets. If the market is resolved a user either wins on their bet, if their prediction was right, or they lose. The market always resolves at 1:1 betting odds.

For example, let's consider a market that was resolved in YES direction (i.e. the acc. in question is spam). If total bets for YES are 10 USD and total bets for NO are 20 USD, then the ones on NO side have only risked 10 USD and they would be able to get back rest of 10 USD (proportional to their contribution to NO pool). The ones on YES side will get back the amount that they had bet + reward from NO pool proportional their contribution to YES pool.

Right now the resolution of the market is centralised and controlled by admin, but I am trying to figure out how can I have a decentralised committee that can participate in resolution of market. Plus, since the application is still experimental and runs on a backend that I developed it might break 😅.

You can also start betting on a new twitter account by adding their twitter handle in the input box labelled "Start betting on a twitter acc." on Home page. I am still working on a chrome extension, which will allow users to view bets related to a account directly on twitter + start betting on new accounts directly from twitter.
