const BN = require("bn.js");
const starkwareCrypto = require("./signature.js");
const {
	pedersenHash,
	getStarkPublicKey,
	signMessage,
	formatAmount,
} = require("./index");
