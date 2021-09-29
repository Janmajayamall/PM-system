import { Button, Box, Text, Flex, useToast } from "@chakra-ui/react";
import {
	useEthers,
	useEtherBalance,
	useTokenBalance,
	useContractFunction,
} from "@usedapp/core";
import { formatEther } from "@ethersproject/units";
import { utils } from "ethers";
import { Contract } from "@ethersproject/contracts";
import { abi as l1L2ContractAbi } from "./../contracts/L1L2Contract.json";
import { l1L2ContractAddress } from "./../contracts/contracts.json";
import { useEffect, useState } from "react";
import { formatAmount, getStarkPublicKey } from "../utils/starkware";
import { checkL1Registration, getUserBalance } from "./../utils/axios";
import {
	sSetUser,
	selectUser,
	selectL2Balance,
	sSetBalance,
} from "./../reducers/app";
import { useDispatch, useSelector } from "react-redux";

const L1L2Interface = new utils.Interface(l1L2ContractAbi);
const L1L2Contract = new Contract(l1L2ContractAddress, L1L2Interface);

function ConnectL2Button() {
	const dispatch = useDispatch();
	const toast = useToast();
	const { activateBrowserWallet, account, chainId } = useEthers();
	const { state: depositUSDState, send: callDepositUSD } =
		useContractFunction(L1L2Contract, "depositUSDC", {
			transactionName: "Wrap",
		});
	// const { state, send } = useContractFunction(fakeUSDContract, "mint", {
	// 	transactionName: "Wrap",
	// });

	const user = useSelector(selectUser);
	const l2Balance = useSelector(selectL2Balance);

	const starkey = localStorage.getItem("starkey");

	useEffect(() => {
		if (starkey) {
			dispatch(sSetUser({ user: getStarkPublicKey(starkey) }));
		}
	}, [starkey]);

	useEffect(async () => {
		await handleGetUserBalance(user);
	}, [user]);

	// useEffect(async () => {
	// 	if (user) {
	// 		response = await checkL1Registration(user);
	// 		setL1Registered(response);
	// 	}
	// }, [user]);

	useEffect(async () => {
		const interval = setInterval(async () => {
			await handleGetUserBalance(user);
		}, 180000);

		return () => clearInterval(interval);
	}, [user]);

	async function handleGetUserBalance(user) {
		if (user) {
			const response = await getUserBalance(user);
			dispatch(sSetBalance({ ...response }));
		}
	}

	return user ? (
		<Flex>
			<Box
				display="flex"
				alignItems="center"
				background="gray.700"
				borderRadius="xl"
				py="0"
			>
				<Box px="3">
					<Text fontWeight="semibold" color="white" fontSize="md">
						Starknet (L2) Acc.
					</Text>
				</Box>
				<Box px="3">
					<Text color="white" fontSize="md">
						{l2Balance && formatAmount(l2Balance)} USD
					</Text>
				</Box>
				<Button
					// onClick={handleOpenModal}
					bg="gray.800"
					border="1px solid transparent"
					_hover={{
						border: "1px",
						borderStyle: "solid",
						borderColor: "blue.400",
						backgroundColor: "gray.700",
					}}
					borderRadius="xl"
					m="1px"
					px={3}
					height="38px"
				>
					<Text
						color="white"
						fontSize="md"
						fontWeight="medium"
						mr="2"
					>
						{user &&
							`${user.slice(0, 6)}...${user.slice(
								user.length - 4,
								user.length
							)}`}
					</Text>
				</Button>
			</Box>
			{chainId === 5 ? (
				<Button
					ml="2"
					colorScheme="teal"
					variant="solid"
					onClick={() => {
						try {
							callDepositUSD(utils.parseEther("5"), user);
							toast({
								title: "Deposit successful!",
								description:
									"Please wait 5 mins for deposit to process!",
								status: "success",
								duration: 9000,
								isClosable: true,
							});
						} catch (e) {
							toast({
								title: "Mint USD on L1",
								description:
									"Not enough funds on L1. Please mint some!",
								status: "error",
								duration: 9000,
								isClosable: true,
							});
						}
					}}
					isLoading={depositUSDState.status === "Mining"}
					loadingText="Mining"
				>
					Deposit 5 USD to L2
				</Button>
			) : undefined}
		</Flex>
	) : account && chainId == 5 ? (
		<Button
			onClick={async () => {
				try {
					// generate a private key
					const accounts = await window.ethereum.enable();
					if (accounts.length === 0) {
						return;
					}
					const l1SignInObject = {
						provider: "Sign In on L2",
					};
					const signature = await window.ethereum.request({
						method: "personal_sign",
						params: [accounts[0], JSON.stringify(l1SignInObject)],
					});
					const privateKey = signature.substring(0, 64);

					// get public key using signature as private key (change; not safe)
					const publicKey = getStarkPublicKey(privateKey);

					// store private in local storage
					localStorage.setItem("starkey", privateKey);

					dispatch(sSetUser({ user: publicKey }));
				} catch (e) {
					toast({
						title: "Error",
						description: "Metamask error. Please try again!",
						status: "error",
						duration: 9000,
						isClosable: true,
					});
				}
			}}
			bg="blue.800"
			color="blue.300"
			fontSize="lg"
			fontWeight="medium"
			borderRadius="xl"
			border="1px solid transparent"
			_hover={{
				borderColor: "blue.700",
				color: "blue.400",
			}}
			_active={{
				backgroundColor: "blue.800",
				borderColor: "blue.700",
			}}
		>
			Connect to L2
		</Button>
	) : (
		<></>
	);
}

export default ConnectL2Button;
