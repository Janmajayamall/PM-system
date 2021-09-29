signal="##################"

echo "${signal} CHECKING FILES ${signal}"
L2_CONTRACT_CAIRO=main.cairo
L2_CONTRACT_SIM_CAIRO=main_sim.cairo
if [ -f "$L2_CONTRACT_CAIRO" ]; then
    echo "$L2_CONTRACT_CAIRO exists."
else 
    echo "$L2_CONTRACT_CAIRO does not exist."
    exit 0
fi
if [ -f "$L2_CONTRACT_SIM_CAIRO" ]; then
    echo "$L2_CONTRACT_SIM_CAIRO exists."
else 
    echo "$L2_CONTRACT_SIM_CAIRO does not exist."
    exit 0
fi
if [ -h "generated" ]; then
    echo "generated dir exists"
else
    mkdir generated
fi
echo "${signal} ${signal} ${signal}"


echo "${signal} DEPLOYING L1 CONTRACTS ${signal}"
cd L1
npx hardhat run --network goerli scripts/l1ContractsDeploy.js
cd ..
echo "${signal} ${signal} ${signal}"

echo "${signal} DEPLOYING L2 CONTRACTS ${signal}"
# deploy l2 contract
source env/bin/activate
starknet-compile main.cairo --output generated/main_compiled.json --abi generated/main_abi.json
starknet-compile main_sim.cairo --output generated/main_sim_compiled.json --abi generated/main_sim_abi.json
python deploy_starknet.py
echo "${signal} ${signal} ${signal}"

# setup L1 contracts with L2 configs
echo "${signal} SETING L1 CONTRACTS WITH L2 CONFIGS ${signal}"
cd L1
npx hardhat run --network goerli scripts/setL2ConfigsOnL1.js
cd ..
echo "${signal} ${signal} ${signal}"

if [ -f "tx_history.pkl" ]; then
    echo "REMOVING PAST TXS"
    rm "tx_history.pkl"
fi