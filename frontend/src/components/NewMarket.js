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
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { addNewMarket } from "../utils/axios";
import { useHistory } from "react-router-dom";

function NewMarket() {
	const { twitterUsername } = useParams();
	const history = useHistory();
	const [loadingAddNewMarket, setLoadingAdNewMarket] = useState(false);

	const [userExistsError, setUserExistsError] = useState(false);

	async function handleAddNewMarket() {
		if (twitterUsername == undefined) {
			return;
		}
	
		const response = await addNewMarket(twitterUsername);
		if (response == undefined) {
			setUserExistsError(true);
			return;
		}

		// do the rest
		history.push(`/market/${twitterUsername}`);
	}

	return (
		<Flex
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			bg="gray.800"
			w={"100%"}
		>
			<Box
				maxW="sm"
				borderWidth="1px"
				borderRadius="lg"
				overflow="hidden"
				color="white"
			>
				<Flex
					p="6"
					justifyContent="center"
					alignItems="center"
					flexDirection="column"
				>
					{userExistsError ? (
						<Badge
							borderRadius="full"
							px="2"
							mb="5"
							colorScheme="red"
						>
							User market exists
						</Badge>
					) : (
						<Badge borderRadius="full" px="2" colorScheme="teal">
							Start betting on new user
						</Badge>
					)}

					{twitterUsername == undefined ? (
						<Box
							Box
							mt="5"
							fontSize="xl"
							fontWeight="semibold"
							as="h2"
							isTruncated
							color="tomato"
						>
							{"Invalid User"}
						</Box>
					) : (
						<>
							<Box
								mt="5"
								fontSize="xl"
								fontWeight="semibold"
								as="h2"
								isTruncated
							>
								{`@${twitterUsername}`}
							</Box>
							<Link
								href={`https://twitter.com/${twitterUsername}`}
								fontSize="sm"
								isExternal
							>
								View account on twitter{" "}
								<ExternalLinkIcon mx="2px" />
							</Link>
							<Button
								size="sm"
								mt="5"
								colorScheme="red"
								variant="solid"
								isLoading={loadingAddNewMarket}
								onClick={() => {
									handleAddNewMarket();
								}}
							>
								Start
							</Button>
						</>
					)}
				</Flex>
			</Box>
		</Flex>
	);
}

export default NewMarket;
