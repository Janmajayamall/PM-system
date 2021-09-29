const hre = require("hardhat");
const starkNetCoreAddress = "0x5e6229F2D4d977d20A50219E521dE6Dd694d45cc";
const { writeContractConfigs, loadContractConfigs } = require("./helpers");

async function main() {
	const contractConfigs = loadContractConfigs();

	// Fake USD contract instance
	const FakeUSD = await hre.ethers.getContractFactory("ERC20");
	const fakeUSD = await FakeUSD.deploy();
	console.log(`FakeUSD deploy on contract address: ${fakeUSD.address}`);

	// deploying L1L2
	const L1L2 = await hre.ethers.getContractFactory("L1L2");
	const l1l2 = await L1L2.deploy(
		contractConfigs.starknetCoreContractAddress,
		fakeUSD.address
	);
	await l1l2.deployed();
	console.log(`L1L2 deployed on contract address: ${l1l2.address}`);

	// setting L1L2 contract address on FakeUSD address
	await fakeUSD.setL1L2Address(l1l2.address);
	console.log(`l1L2Address set to ${l1l2.address} on FakeUSD contract`);

	writeContractConfigs({
		l1L2ContractAddress: l1l2.address,
		fakeUSDContractAddress: fakeUSD.address,
	});
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
