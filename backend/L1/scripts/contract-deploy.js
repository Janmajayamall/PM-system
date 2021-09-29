const hre = require("hardhat");
const starkNetCoreAddress = "0x5e6229F2D4d977d20A50219E521dE6Dd694d45cc";

async function main() {
	// deploying L1L2
	const L1L2 = await hre.ethers.getContractFactory("L1L2");
	const l1l2 = await L1L2.deploy(starkNetCoreAddress);
	await l1l2.deployed();
	console.log("L1L2 contract address:", l1l2.address);

	// deploying FakeUSD
	// const FakeUSD = await hre.ethers.getContractFactory("ERC20");
	// const fakeUSD = await FakeUSD.deploy();
	// await fakeUSD.deployed();
	// console.log("FakeUSD contract address:", fakeUSD.address);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
