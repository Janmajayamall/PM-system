const starkwareCrypto = require("./signature.js");
const { formatEther } = require("@ethersproject/units");

function getStarkPublicKey(privateKey) {
	const keyPair = getKeyPair(privateKey);
	const publicKey = starkwareCrypto.ec.keyFromPublic(
		keyPair.getPublic(true, "hex"),
		"hex"
	);
	return publicKey.pub.getX().toString();
}

function pedersenHash(x, y) {
	return starkwareCrypto.pedersen([x, y]);
}

function signMessage(msgHash, privateKey) {
	const keyPair = getKeyPair(privateKey);
	const signature = starkwareCrypto.sign(keyPair, msgHash);
	return {
		r: signature.r.toString(10),
		s: signature.s.toString(10),
	};
}

function getKeyPair(privateKey) {
	return starkwareCrypto.ec.keyFromPrivate(privateKey.substring(2), "hex");
}

function formatAmount(amount) {
	return parseFloat(formatEther(amount)).toFixed(1);
}

module.exports = {
	getStarkPublicKey,
	pedersenHash,
	signMessage,
	formatAmount,
};
