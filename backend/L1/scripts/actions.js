const { BigNumber } = require("@ethersproject/bignumber");
const hre = require("hardhat");

const L1L2ContractAddress = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";
const FakeUSDAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function main() {
	// L1L2 contract instance
	const L1L2 = await hre.ethers.getContractFactory("L1L2");
	const l1l2 = await L1L2.attach(L1L2ContractAddress);

	// FakeUSD contract instance
	const FakeUSD = await hre.ethers.getContractFactory("ERC20");
	const fakeUSD = await FakeUSD.attach(FakeUSDAddress);

	// // mint 5 FakeUSD
	// var exp = ethers.BigNumber.from("10").pow(18);
	// const tokensAmount = ethers.BigNumber.from("5").mul(exp);
	// var response = await fakeUSD.mint(tokensAmount);
	// console.log("Minted 5 FakeUSD", response);

	// // // // set l1L2Address in FakeUSD
	// var response = await fakeUSD._allowances(
	// 	"0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
	// 	L1L2ContractAddress
	// );
	// console.log("l1L2Address allowance", response);
	// return;
	// var response = await fakeUSD._l1L2Address();
	// console.log("l1L2Address set", response);
	// return;
	// function calls

	// var response = await fakeUSD.balanceOf(L1L2ContractAddress);
	// console.log(`Balance of ${L1L2ContractAddress} - ${response}`);
	// return;

	// set l1L2Address in FakeUSD
	// var response = await fakeUSD.setL1L2Address(L1L2ContractAddress);
	// console.log("l1L2Address set", response);

	// // set L2Contract address (starknet) in L1L2
	// var response = await l1l2.modifyL2Address(L2ContractAddress);
	// console.log("L2 address modified in L1L2 contract", response);

	// register starkey in L1L2
	// var response = await l1l2.registerStarkey(
	// 	"3330097989871300905049846049049006350786391673929825344946269499239265899536"
	// );
	// console.log("Starkey registered:", response);

	// // deposit 5 fakeUSD to l2
	var exp = ethers.BigNumber.from("10").pow(18);
	const depositAmount = ethers.BigNumber.from("5").mul(exp);
	response = await l1l2.depositUSDC(
		depositAmount,
		"236674633417999769456764094354965200251110376610569403948542844693824382636"
	);
	console.log("Fake USD deposited in L2:", response);

	// burn fake USD
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
