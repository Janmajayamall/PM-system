import asyncio
import json
import argparse
import copy
from services.external_api.base_client import RetryConfig
from starkware.starknet.services.api.gateway.gateway_client import GatewayClient
from starkware.starknet.definitions import fields
from starkware.starknet.services.api.contract_definition import ContractDefinition
from starkware.starknet.services.api.gateway.transaction import Deploy, InvokeFunction
from starkware.starkware_utils.error_handling import StarkErrorCode
from starkware.starknet.compiler.compile import get_selector_from_name
from starkware.crypto.signature.signature import (pedersen_hash, private_to_stark_key, sign)

def write_json_file(file_path, data):
    with open(file_path, 'r+') as json_file:
        prev_data = json.load(json_file)
        for key in prev_data:
            if key not in data:
                data[key] = prev_data[key]
        json_file.seek(0)
        json.dump(data, json_file, indent = 4, sort_keys=True)

def load_json_file(file_path):
    json_str = {}
    with open(file_path) as json_file:
        json_str = json_file.read()
    return json_str

def get_gateway_client():
    gateway_url = "https://alpha2.starknet.io/gateway"
    retry_config = RetryConfig(n_retries=1)
    gateway_client = GatewayClient(url=gateway_url, retry_config=retry_config)
    return gateway_client

async def invoke(address, selector, calldata):
    tx = InvokeFunction(contract_address=address, entry_point_selector=selector, calldata=calldata)

    gateway_client = get_gateway_client()
    gateway_response = await gateway_client.add_transaction(tx=tx)

    assert (
            gateway_response["code"] == StarkErrorCode.TRANSACTION_RECEIVED.name
        ), f"Failed to send transaction. Response: {gateway_response}."

    print(
    f"""\
    Invoke transaction was sent.
    Contract address: 0x{address:064x}
    Transaction ID: {gateway_response['tx_id']}"""
    )

async def deploy():
    try:
        address = (fields.ContractAddressField.get_random_value())
    except ValueError:
        raise ValueError("Invalid address format.")

    # load compiled contract
    contract_json = load_json_file("generated/main_compiled.json")
    contract_definition = ContractDefinition.loads(contract_json)
    tx = Deploy(contract_address=address, contract_definition=contract_definition)

    gateway_client = get_gateway_client()
    gateway_response = await gateway_client.add_transaction(tx=tx)
    assert (
        gateway_response["code"] == StarkErrorCode.TRANSACTION_RECEIVED.name
    ), f"Failed to send transaction. Response: {gateway_response}."
    print(
            f"""\
    Deploy transaction was sent.
    Contract address: 0x{address:064x}
    Transaction ID: {gateway_response['tx_id']}"""
        )

    contract_configs = json.loads(load_json_file("contracts.json"))
    key_configs = json.loads(load_json_file("keys.json"))

    # initialise l2 contract
    function_selector = get_selector_from_name("initialize")
    owner_public_key = private_to_stark_key(int(key_configs["l2OwnerPvKey"], 16))
    calldata = [owner_public_key, int(contract_configs["l1L2ContractAddress"], 16)]
    await invoke(address, function_selector, calldata)
    
    # save l2 contract address in contracts.json
    str_address = f"0x{address:064x}"
    write_json_file("contracts.json", {"l2ContractAddress":str_address})

if __name__ == "__main__":
    asyncio.run(deploy())