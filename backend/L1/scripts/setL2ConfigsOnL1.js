const hre = require("hardhat");
const fs = require("fs");
const { writeContractConfigs, loadContractConfigs } = require("./helpers");

async function main() {
	const contractConfigs = loadContractConfigs();

	// L1L2 contract instance
	const L1L2 = await hre.ethers.getContractFactory("L1L2");
	const l1l2 = await L1L2.attach(contractConfigs.l1L2ContractAddress);

	// setting L2 address on L1L2
	await l1l2.modifyL2Address(contractConfigs.l2ContractAddress);
	console.log(
		`L2 address changed in L1L2 contract of address ${contractConfigs.l1L2ContractAddress} to ${contractConfigs.l2ContractAddress}`
	);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
