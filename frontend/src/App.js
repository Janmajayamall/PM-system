import logo from "./logo.svg";
import "./App.css";
import React, { useEffect, useState } from "react";
import {
	BrowserRouter as Router,
	Switch,
	Route,
	useHistory,
	useLocation,
} from "react-router-dom";
import {
	ChakraProvider,
	Flex,
	VStack,
	Box,
	Text,
	Spacer,
	Heading,
	Button,
	Input,
} from "@chakra-ui/react";
import ConnectButton from "./components/ConnectButton";
import { useEthers, useEtherBalance, useTokenBalance } from "@usedapp/core";
import ConnectL2Button from "./components/ConnectL2Button";
import { getActiveMarkets, getUserBalance, getUserBets } from "./utils/axios";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import Market from "./components/Market";
import { getStarkPublicKey } from "./utils/starkware/index";
import {
	sSetMarkets,
	sAddBets,
	selectMarkets,
	selectBets,
} from "./reducers/app";
import { useDispatch, useSelector } from "react-redux";
import NewMarket from "./components/NewMarket";
import SingleMarket from "./components/SingleMarket";
import NewHandle from "./components/NewHandle";

function App() {
	const { chainId } = useEthers();
	const dispatch = useDispatch();
	const history = useHistory();
	const location = useLocation();
	const markets = useSelector(selectMarkets);
	const userBets = useSelector(selectBets);
	const activeMarkets = markets.filter((m) => m.state === "1");
	const resolvingMarkets = markets.filter((m) => m.state === "2");
	const getMoneyMarkets = markets.filter(
		(m) =>
			(m.state == "4" || m.state == "3") &&
			userBets.find((b) => b.market_id == m.market_id) != undefined
	);
	const pastMarkets = markets.filter(
		(m) =>
			(m.state == "4" || m.state == "3") &&
			userBets.find((b) => b.market_id == m.market_id) == undefined
	);

	const starkey = localStorage.getItem("starkey");

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
		<ChakraProvider>
			<VStack
				// divider={<StackDivider borderColor="gray.200" />}
				spacing={4}
				align="stretch"
				bg="gray.800"
				minH="100vh"
			>
				{chainId != 5 ? (
					<Box bg="red.500" h="40px" alignItems="center">
						{/* <Flex w="100%">
							<Spacer></Spacer>
						</Flex> */}
						<Heading
							p={2}
							as="h1"
							size="md"
							color="white"
							isTruncated
							alignSelf="center"
						>
							To proceed, please connect to Goerli Test network
						</Heading>
					</Box>
				) : undefined}
				<Flex p={5} flexDirection="column" alignItems="center">
					<Flex w={"100%"} p="2">
						<Button
							ml="2"
							colorScheme="teal"
							variant="solid"
							onClick={() => {
								if (history) {
									history.push("/");
								}
							}}
						>
							Home
						</Button>
						<Spacer />
						<ConnectButton />
					</Flex>
					<Flex w={"100%"} p="2">
						<Spacer />
						<ConnectL2Button />
					</Flex>
					{location.pathname === "/" ? (
						<Flex w={"100%"} p="2">
							<NewHandle />
							<Spacer />
						</Flex>
					) : undefined}
					<Spacer />

					<Switch>
						<Route path="/new/:twitterUsername">
							<Flex w={"100%"} p="2">
								<NewMarket />
							</Flex>
						</Route>
						<Route path="/market/:twitterUsername">
							<SingleMarket />
						</Route>
						<Route path="/">
							<VStack w={"70%"}>
								<Text
									bgGradient="linear(to-l, #7928CA, #FF0080)"
									bgClip="text"
									fontSize="6xl"
									fontWeight="extrabold"
								>
									Active Markets
								</Text>
								{activeMarkets.length === 0 ? (
									<Text
										bgGradient="linear(to-r, green.200, pink.500)"
										bgClip="text"
										fontSize="xl"
										fontWeight="extrabold"
									>
										No active markets
									</Text>
								) : undefined}
								{activeMarkets.map((market) => {
									const userBet = userBets.find(
										(bet) =>
											bet.market_id === market.market_id
									);
									return (
										<Market market={market} bet={userBet} />
									);
								})}
								<Box h="10" />
								{resolvingMarkets.length !== 0 ? (
									<Text
										bgGradient="linear(to-l, #7928CA, #FF0080)"
										bgClip="text"
										fontSize="6xl"
										fontWeight="extrabold"
									>
										Under Resolving
									</Text>
								) : undefined}
								{resolvingMarkets.map((market) => {
									const userBet = userBets.find(
										(bet) =>
											bet.market_id === market.market_id
									);
									return (
										<Market market={market} bet={userBet} />
									);
								})}
								<Box h="10" />
								{getMoneyMarkets.length !== 0 ? (
									<Text
										bgGradient="linear(to-l, #7928CA, #FF0080)"
										bgClip="text"
										fontSize="6xl"
										fontWeight="extrabold"
									>
										Claim Your Money
									</Text>
								) : undefined}
								{getMoneyMarkets.map((market) => {
									const userBet = userBets.find(
										(bet) =>
											bet.market_id === market.market_id
									);
									return (
										<Market market={market} bet={userBet} />
									);
								})}
								{resolvingMarkets.length !== 0 ? (
									<Text
										bgGradient="linear(to-l, #7928CA, #FF0080)"
										bgClip="text"
										fontSize="6xl"
										fontWeight="extrabold"
									>
										Under Resolving
									</Text>
								) : undefined}
								{resolvingMarkets.map((market) => {
									const userBet = userBets.find(
										(bet) =>
											bet.market_id === market.market_id
									);
									return (
										<Market market={market} bet={userBet} />
									);
								})}
								{pastMarkets.length !== 0 ? (
									<Text
										bgGradient="linear(to-l, #7928CA, #FF0080)"
										bgClip="text"
										fontSize="6xl"
										fontWeight="extrabold"
									>
										Past Markets
									</Text>
								) : undefined}
								{pastMarkets.map((market) => {
									const userBet = userBets.find(
										(bet) =>
											bet.market_id === market.market_id
									);
									return (
										<Market market={market} bet={userBet} />
									);
								})}
							</VStack>
						</Route>
					</Switch>

					<Spacer />
				</Flex>
			</VStack>
		</ChakraProvider>
	);
}

export default App;
