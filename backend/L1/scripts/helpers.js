const fs = require("fs");
const path = require("path");
const contractsFilePath = path.resolve(__dirname, "./../../contracts.json");

function writeContractConfigs(fields) {
	var values = fs.readFileSync(contractsFilePath, "utf8");
	values = JSON.parse(values);
	newValues = {
		...values,
		...fields,
	};
	fs.writeFileSync(
		contractsFilePath,
		JSON.stringify(newValues),
		function (err) {
			if (err) throw err;
		}
	);
}

function loadContractConfigs() {
	var values = fs.readFileSync(contractsFilePath, "utf8");
	values = JSON.parse(values);
	return values;
}

module.exports = {
	writeContractConfigs,
	loadContractConfigs,
};
