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
	Input,
} from "@chakra-ui/react";
import { useState } from "react";

import { useHistory } from "react-router-dom";

function NewHandle() {
	const [twitterHandle, setTwitterHandle] = useState("");
	const history = useHistory();
	function handleChange(e) {
		setTwitterHandle(e.target.value);
	}
	function startBetting() {
		if (twitterHandle.length === 0) {
			return;
		}

		// sanity checks
		if (
			twitterHandle.split(" ").length === 1 &&
			twitterHandle.split(".").length === 1 &&
			twitterHandle.split(",").length === 1 &&
			(twitterHandle.split("@").length === 2 ||
				twitterHandle.split("@").length === 1)
		) {
			var handle = twitterHandle.toLowerCase();
			if (handle.charAt(0) === "@") {
				handle = handle.substr(1);
			}
			history.push(`/new/${handle}`);
		}
	}
	return (
		<Box flexDirection="row" maxW="sm" overflow="hidden" color="white">
			<Text fontSize="lg">Start betting on a twitter acc.</Text>
			<Flex>
				<Input
					onChange={handleChange}
					placeholder="Twitter handle"
					size="md"
				/>
				<Button onClick={startBetting} colorScheme="teal">
					Start
				</Button>
			</Flex>
		</Box>
	);
}

export default NewHandle;
