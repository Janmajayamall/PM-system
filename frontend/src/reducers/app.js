import { AtSignIcon } from "@chakra-ui/icons";
import { createSlice } from "@reduxjs/toolkit";

export const appSlice = createSlice({
	name: "app",
	initialState: {
		user: undefined,
		l2Balance: "",
		markets: [],
		bets: [],
	},
	reducers: {
		sSetUser: (state, action) => {
			const { user } = action.payload;

			return {
				...state,
				user: user,
			};
		},
		sSetBalance: (state, action) => {
			const { amount } = action.payload;
			return {
				...state,
				l2Balance: amount,
			};
		},
		sSetMarkets: (state, action) => {
			const { markets } = action.payload;
			return {
				...state,
				markets: markets,
			};
		},
		sUpdateMarkets: (state, action) => {
			const { market } = action.payload;
			let updatedMarkets = [];
			let foundMarket = false;
			state.markets.forEach((m) => {
				if (m.market_id === market.market_id) {
					updatedMarkets.push(market);
					foundMarket = true;
				} else {
					updatedMarkets.push(m);
				}
			});
			if (foundMarket === false) {
				updatedMarkets = [market, ...updatedMarkets];
			}

			return {
				...state,
				markets: updatedMarkets,
			};
		},
		sAddBets: (state, action) => {
			const { bets } = action.payload;
			const updatedBets = [...state.bets, ...bets];

			return {
				...state,
				bets: updatedBets,
			};
		},
		sRemoveBet: (state, action) => {
			const { marketId } = action.payload;
			const updatedBets = state.bets.filter(
				(bet) => bet.market_id !== marketId
			);

			return {
				...state,
				bets: updatedBets,
			};
		},
	},
});

// Action creators are generated for each case reducer function
export const {
	sSetUser,
	sSetBalance,
	sUpdateMarkets,
	sAddBets,
	sRemoveBet,
	sSetMarkets,
} = appSlice.actions;

export const selectUser = (state) => state.app.user;
export const selectL2Balance = (state) => state.app.l2Balance;
export const selectMarkets = (state) => state.app.markets;
export const selectBets = (state) => state.app.bets;

export default appSlice.reducer;
