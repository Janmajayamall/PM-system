import {
	ChakraProvider,
	useDisclosure,
	Flex,
	VStack,
	StackDivider,
	Box,
	Text,
	Spacer,
	Button,
	Badge,
	Link,
	Heading,
	NumberInput,
	NumberInputField,
	NumberInputStepper,
	NumberIncrementStepper,
	NumberDecrementStepper,
} from "@chakra-ui/react";
import {
	useEthers,
	useEtherBalance,
	useTokenBalance,
	useContractFunction,
} from "@usedapp/core";
import { formatEther } from "@ethersproject/units";
import { utils } from "ethers";
import { Contract } from "@ethersproject/contracts";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { addNewMarket } from "../utils/axios";
import Market from "./Market";
import {
	getActiveMarkets,
	getUserBets,
	checkL1Registration,
} from "./../utils/axios";
import {
	sSetMarkets,
	sAddBets,
	selectMarkets,
	selectBets,
} from "./../reducers/app";
import { useDispatch, useSelector } from "react-redux";
import { getStarkPublicKey } from "./../utils/starkware/index";

function SingleMarket() {
	const { twitterUsername } = useParams();
	const dispatch = useDispatch();

	const activeMarkets = useSelector(selectMarkets);
	const userBets = useSelector(selectBets);
	const starkey = localStorage.getItem("starkey");

	const currentMarket = activeMarkets.find(
		(market) => market.twitter_username === twitterUsername
	);

	const userBet = userBets.find(
		(bet) => currentMarket && currentMarket.market_id === bet.market_id
	);

	useEffect(async () => {
		var res = await getActiveMarkets();
		dispatch(sSetMarkets({ markets: res }));

		var res;
		if (starkey != undefined) {
			res = await getUserBets(starkey);
		} else {
			res = [];
		}
		dispatch(sAddBets({ bets: res }));
	}, []);

	return (
		<Flex
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			bg="gray.800"
			pl="40"
			pr="40"
			w="100%"
		>
			{currentMarket != undefined ? (
				<Market market={currentMarket} bet={userBet} />
			) : undefined}
		</Flex>
	);
}

export default SingleMarket;
