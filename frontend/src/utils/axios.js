import { createBatcher } from "framer-motion";
import { getStarkPublicKey, pedersenHash, signMessage } from "./starkware";

const axios = require("axios");

const BASE_URL = "https://app.shootups.live/";
// const BASE_URL = "http://127.0.0.1:5000/";

const headers = {
	"Content-Type": "application/json",
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,PATCH,OPTIONS",
};

export async function getActiveMarkets() {
	const response = await axios.post(
		BASE_URL + "view",
		{
			action: "VIEW_ALL_MARKETS",
		},
		{
			headers: headers,
		}
	);

	return response.data;
}

export async function getUserBalance(publicKey) {
	const response = await axios.post(
		BASE_URL + "view",
		{
			action: "VIEW_BALANCE",
			user: String(publicKey),
		},
		{
			headers: headers,
		}
	);

	return response.data;
}

export async function getUserBets(privateKey) {
	try {
		const publicKey = getStarkPublicKey(privateKey);
		const response = await axios.post(
			BASE_URL + "view",
			{
				action: "VIEW_USER_BETS",
				user: String(publicKey),
			},
			{
				headers: headers,
			}
		);

		return response.data;
	} catch (e) {
		return [];
	}
}

export async function checkL1Registration(privateKey) {
	try {
		const publicKey = getStarkPublicKey(privateKey);
		const response = await axios.post(
			BASE_URL + "view",
			{
				action: "VIEW_L1_REGISTRATION",
				user: String(publicKey),
			},
			{ headers: headers }
		);
		if (response.data.registered === true) {
			return true;
		}
		return false;
	} catch (e) {}
}

export async function placeBet(privateKey, marketId, betAmount, betDirection) {
	try {
		const msgHash = pedersenHash(
			pedersenHash(Number(marketId), Number(betAmount)),
			Number(betDirection)
		);
		const signature = signMessage(msgHash, privateKey);
		const publicKey = getStarkPublicKey(privateKey);

		const response = await axios.post(
			BASE_URL + "markets",
			{
				action: "PLACE_BET",
				user: String(publicKey),
				market: {
					market_id: String(marketId),
				},
				bet: {
					amount: String(betAmount),
					direction: String(betDirection),
				},
				signature: {
					sig_r: String(signature.r),
					sig_s: String(signature.s),
				},
			},
			{ headers: headers }
		);

		return response.data;
	} catch (e) {}
}

export async function removeBet(privateKey, marketId) {
	try {
		const msgHash = pedersenHash(Number(marketId), 0);

		const signature = signMessage(msgHash, privateKey);
		const publicKey = getStarkPublicKey(privateKey);

		const response = await axios.post(
			BASE_URL + "markets",
			{
				action: "REMOVE_BET",
				user: String(publicKey),
				market: {
					market_id: String(marketId),
				},
				signature: {
					sig_r: String(signature.r),
					sig_s: String(signature.s),
				},
			},
			{ headers: headers }
		);

		return response.data;
	} catch (e) {}
}

export async function addNewMarket(twitterUsername) {
	try {
		const response = await axios.post(
			BASE_URL + "markets",
			{
				action: "NEW_MARKET",
				market_details: {
					twitter_username: twitterUsername,
				},
			},
			{ headers: headers }
		);
		return response.data;
	} catch (e) {
		console.log("Error adding market ", e);
	}
}

export async function claimReward(privateKey, marketId) {
	try {
		const publicKey = getStarkPublicKey(privateKey);

		const response = await axios.post(
			BASE_URL + "markets",
			{
				action: "CLAIM_REWARD",
				user: String(publicKey),
				market: {
					market_id: String(marketId),
				},
			},
			{ headers: headers }
		);

		return response.data;
	} catch (e) {
		console.log("Error claiming reward ", e);
	}
}

export async function refundBet(privateKey, marketId) {
	try {
		const publicKey = getStarkPublicKey(privateKey);
		const response = await axios.post(
			BASE_URL + "markets",
			{
				action: "REFUND_BET",
				user: String(publicKey),
				market: {
					market_id: String(marketId),
				},
			},
			{ headers: headers }
		);

		return response.data;
	} catch (e) {
		console.log("Error refunding bet amount ", e);
	}
}
