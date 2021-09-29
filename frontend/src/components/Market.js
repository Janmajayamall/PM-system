import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
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
	useToast,
} from "@chakra-ui/react";
import { useEthers, useEtherBalance, useTokenBalance } from "@usedapp/core";
import { ExternalLinkIcon } from "@chakra-ui/icons";

import { formatAmount, getStarkPublicKey } from "../utils/starkware";
import { claimReward, placeBet, refundBet, removeBet } from "../utils/axios";
import {
	sAddBets,
	sRemoveBet,
	sSetBalance,
	sUpdateMarkets,
} from "../reducers/app";
import { useDispatch } from "react-redux";

function Market({ market, bet }) {
	const dispatch = useDispatch();
	const toast = useToast();
	const [newBetAmount, setNewBetAmount] = useState(0);
	const [newBetLoading, setNewBetLoading] = useState(false);

	const [buttonLoading, setButtonLoading] = useState(0);
	const starkey = localStorage.getItem("starkey");

	function errorToast(text = "Please try again later!") {
		toast({
			title: "Error",
			description: text,
			status: "error",
			duration: 9000,
			isClosable: true,
		});
	}

	function successToast(description) {
		toast({
			title: "Success",
			description: description,
			status: "success",
			duration: 9000,
			isClosable: true,
		});
	}

	async function handlePlaceBet(betDirection) {
		if (
			newBetAmount == 0 ||
			newBetLoading == true ||
			starkey == undefined
		) {
			errorToast("Connect Metamask / Connect to L2");
			return;
		}

		// place bet
		setNewBetLoading(true);
		const response = await placeBet(
			starkey,
			market.market_id,
			newBetAmount,
			betDirection
		);
		setNewBetLoading(false);

		if (response == undefined) {
			toast({
				title: "Not enough balance",
				description: "Please add balance to place a bet",
				status: "error",
				duration: 9000,
				isClosable: true,
			});
		} else {
			successToast("Placed your bet");
			dispatch(
				sAddBets({
					bets: [response.bet],
				})
			);
			dispatch(
				sSetBalance({
					...response.user,
				})
			);
			dispatch(
				sUpdateMarkets({
					market: response.market,
				})
			);
		}
	}

	async function handleRemoveBet() {
		if (bet == undefined || market == undefined || starkey == undefined) {
			return;
		}

		setButtonLoading(true);
		const response = await removeBet(starkey, market.market_id);
		setButtonLoading(false);

		if (response != undefined) {
			successToast("Removed your bet");
			dispatch(sRemoveBet({ marketId: market.market_id }));
			dispatch(
				sSetBalance({
					...response.user,
				})
			);
			dispatch(
				sUpdateMarkets({
					market: response.market,
				})
			);
		} else {
			errorToast();
		}
	}

	async function handleClaimReward() {
		if (bet == undefined || market == undefined || starkey == undefined) {
			return;
		}

		setButtonLoading(true);
		const response = await claimReward(starkey, market.market_id);
		setButtonLoading(false);

		if (response != undefined) {
			successToast("Done!");
			dispatch(sRemoveBet({ marketId: response.market.market_id }));
			dispatch(
				sSetBalance({
					...response.user,
				})
			);
		} else {
			errorToast();
		}
	}

	async function handleRefundBet() {
		if (bet == undefined || market == undefined || starkey == undefined) {
			return;
		}

		setButtonLoading(true);
		const response = await refundBet(starkey, market.market_id);
		setButtonLoading(false);

		if (response != undefined) {
			successToast("Refunded your bet");
			dispatch(sRemoveBet({ marketId: response.market.market_id }));
			dispatch(
				sSetBalance({
					...response.user,
				})
			);
		} else {
			errorToast();
		}
	}

	function getBadge() {
		if (market.state === "2") {
			return "RESOLVING";
		} else if (market.state === "3") {
			return "RESOLVED";
		} else if (market.state === "4") {
			return "EXPIRED";
		}
		return "ACTIVE";
	}

	return (
		<Box
			border="1px solid transparent"
			bg="blue.800"
			borderRadius="xl"
			w="100%"
			p={4}
			color="white"
		>
			<Flex>
				<Box flexDirection="column">
					<Badge borderRadius="full" px="2" colorScheme="teal">
						{getBadge()}
					</Badge>
					<Box mt="1" fontWeight="semibold" as="h1" isTruncated>
						{`Is @${market.twitter_username} fake/spam account?`}
					</Box>
					<Link
						href={`https://twitter.com/${market.twitter_username}`}
						fontSize="sm"
						isExternal
					>
						View account on twitter <ExternalLinkIcon mx="2px" />
					</Link>

					{/* state == 1 & bet does not exists, then user can place a bet */}
					{bet == undefined && market.state == "1" ? (
						<>
							<Flex mt="2" alignItems="center">
								<Text fontWeight="semibold" size="sm" mr="2">
									Your bet
								</Text>
								<NumberInput
									size="sm"
									w="20"
									defaultValue={0}
									min={0}
									max={20}
									onChange={(value) => {
										setNewBetAmount(value);
									}}
								>
									<NumberInputField />
								</NumberInput>
								<Text fontWeight="semibold" size="sm" mr="2">
									{" USD"}
								</Text>
							</Flex>
							<Flex mt="2">
								<Button
									size="sm"
									m="1"
									colorScheme="blue"
									variant="solid"
									isLoading={newBetLoading}
									onClick={() => {
										handlePlaceBet(1);
									}}
								>
									YES
								</Button>
								<Button
									size="sm"
									m="1"
									colorScheme="red"
									variant="solid"
									isLoading={newBetLoading}
									onClick={() => {
										handlePlaceBet(0);
									}}
								>
									NO
								</Button>
							</Flex>
						</>
					) : undefined}

					{/* bet exists, then show it */}
					{bet != undefined ? (
						<Text fontWeight="semibold" size="sm" mt="2" mr="2">
							{`Your bet : ${formatAmount(bet.amount)} USD for ${
								bet.direction == "0" ? "NO" : "YES"
							}`}
						</Text>
					) : undefined}

					{/* state == 1 & bet exists, user can remove bet */}
					{bet != undefined && market.state == "1" ? (
						<Button
							size="sm"
							mt="2"
							colorScheme="red"
							variant="solid"
							isLoading={buttonLoading}
							onClick={() => {
								handleRemoveBet();
							}}
						>
							REMOVE BET
						</Button>
					) : undefined}

					{/* state == 3, then show the result */}
					{market.state == "3" ? (
						<Text mt="2" fontWeight="semibold" size="sm" mr="2">
							{`${
								market.ruling == "2"
									? "UNRESOLVED (TIE)"
									: `MARKET Resolved in ${
											market.ruling == "1" ? "YES" : "NO"
									  }`
							}`}
						</Text>
					) : undefined}

					{/* state == 3 & bet exists, user can claim money */}
					{bet != undefined && market.state == "3" ? (
						<Button
							size="sm"
							mt="2"
							colorScheme="red"
							variant="solid"
							isLoading={buttonLoading}
							onClick={() => {
								handleClaimReward();
							}}
						>
							{market.ruling === bet.direction
								? "CLAIM REWARD"
								: "CLAIM EXCESS BET"}
						</Button>
					) : undefined}

					{/* state == 4, market expired */}
					{market.state == "4" ? (
						<Text mt="2" fontWeight="semibold" size="sm" mr="2">
							{`Market remains UNRESOLVED`}
						</Text>
					) : undefined}

					{/* state == 4 & bet exits, user can refund then bet */}
					{bet != undefined && market.state == "4" ? (
						<Button
							size="sm"
							mt="2"
							colorScheme="red"
							variant="solid"
							isLoading={buttonLoading}
							onClick={() => {
								handleRefundBet();
							}}
						>
							REFUND BET
						</Button>
					) : undefined}
				</Box>
				<Spacer />
				<Flex flexDirection="column" p="2" justifyContent="center">
					<Spacer />
					<Heading p={2} as="h1" size="md" color="white" isTruncated>
						Total Volume
					</Heading>
					<Heading as="h1" size="md" color="blue.100" isTruncated>
						{`${formatAmount(market.total_up)} USD for YES`}
					</Heading>
					<Heading as="h1" size="md" color="red.200" isTruncated>
						{`${formatAmount(market.total_down)} USD for NO`}
					</Heading>
					<Spacer />
				</Flex>
			</Flex>
		</Box>
	);
}

export default Market;
