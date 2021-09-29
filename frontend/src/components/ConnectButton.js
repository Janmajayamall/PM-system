import { Button, Box, Text, Flex } from "@chakra-ui/react";
import {
	useEthers,
	useEtherBalance,
	useTokenBalance,
	useContractFunction,
} from "@usedapp/core";
import { formatEther } from "@ethersproject/units";
import { utils } from "ethers";
import { Contract } from "@ethersproject/contracts";
import { abi } from "./../contracts/FakeUSD.json";
import { fakeUSDContractAddress } from "./../contracts/contracts.json";
import { formatAmount } from "../utils/starkware";

const fakeUSDInterface = new utils.Interface(abi);
const fakeUSDContract = new Contract(fakeUSDContractAddress, fakeUSDInterface);

function ConnectButton() {
	const { activateBrowserWallet, account, chainId } = useEthers();

	const { state, send } = useContractFunction(fakeUSDContract, "mint", {
		transactionName: "Wrap",
	});

	const etherBalance = useEtherBalance(account);
	const fakeUSDBalance = useTokenBalance(fakeUSDContractAddress, account);
	return account ? (
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
						{chainId === 5
							? "Georli Test Network (L1) Acc."
							: "Connect to Georli Test Network"}
					</Text>
				</Box>
				<Box px="3">
					<Text color="white" fontSize="md">
						{fakeUSDBalance && formatAmount(fakeUSDBalance)} USD
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
						{account &&
							`${account.slice(0, 6)}...${account.slice(
								account.length - 4,
								account.length
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
						send(utils.parseEther("5"));
					}}
					isLoading={state.status === "Mining"}
					loadingText="Mining"
				>
					Mint 5 USD
				</Button>
			) : undefined}
		</Flex>
	) : (
		<Button
			onClick={() => {
				activateBrowserWallet();
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
			Connect to a wallet
		</Button>
	);
}

export default ConnectButton;
