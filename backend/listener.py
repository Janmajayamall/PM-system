# Import WebSocket client library (and others)
import websocket
import _thread
import time
from web3 import Web3
from eth_utils import decode_hex
import json
import eth_abi
from starkware.crypto.signature.signature import (pedersen_hash, private_to_stark_key, sign)
import copy
import requests
import os

w3 = Web3()
starknet_contract_abi = '[{"inputs":[{"internalType":"uint256","name":"programHash_","type":"uint256"},{"internalType":"contract IFactRegistry","name":"verifier_","type":"address"},{"components":[{"internalType":"uint256","name":"globalRoot","type":"uint256"},{"internalType":"int256","name":"sequenceNumber","type":"int256"}],"internalType":"struct StarknetState.State","name":"initialState","type":"tuple"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"from_address","type":"uint256"},{"indexed":true,"internalType":"address","name":"to_address","type":"address"},{"indexed":false,"internalType":"uint256[]","name":"payload","type":"uint256[]"}],"name":"LogMessageToL1","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from_address","type":"address"},{"indexed":true,"internalType":"uint256","name":"to_address","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"selector","type":"uint256"},{"indexed":false,"internalType":"uint256[]","name":"payload","type":"uint256[]"}],"name":"LogMessageToL2","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bytes32","name":"stateTransitionFact","type":"bytes32"}],"name":"LogStateTransitionFact","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"globalRoot","type":"uint256"},{"indexed":false,"internalType":"int256","name":"sequenceNumber","type":"int256"}],"name":"LogStateUpdate","type":"event"},{"inputs":[{"internalType":"uint256","name":"from_address","type":"uint256"},{"internalType":"uint256[]","name":"payload","type":"uint256[]"}],"name":"consumeMessageFromL2","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"identify","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"l1ToL2Messages","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"l2ToL1Messages","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"to_address","type":"uint256"},{"internalType":"uint256","name":"selector","type":"uint256"},{"internalType":"uint256[]","name":"payload","type":"uint256[]"}],"name":"sendMessageToL2","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"stateRoot","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"stateSequenceNumber","outputs":[{"internalType":"int256","name":"","type":"int256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"int256","name":"sequenceNumber","type":"int256"},{"internalType":"uint256[]","name":"programOutput","type":"uint256[]"},{"components":[{"internalType":"uint256","name":"onchainDataHash","type":"uint256"},{"internalType":"uint256","name":"onchainDataSize","type":"uint256"}],"internalType":"struct OnchainDataFactTreeEncoder.DataAvailabilityFact","name":"data_availability_fact","type":"tuple"}],"name":"updateState","outputs":[],"stateMutability":"nonpayable","type":"function"}]'
starknet_contract = w3.eth.contract(abi=starknet_contract_abi)

'''
Localhost request details
'''

L2_deposits = []
lock = _thread.allocate_lock()

global keysConfigDict
global contractsConfigDict

def sign_message(message, private_key):
    signature = sign(msg_hash=message, priv_key=private_key)
    return signature[0], signature[1]
    
def send_eligible_l2_deposits():
    # copy available deposit messages
    global L2_deposits
    t_l2_deposits = copy.deepcopy(L2_deposits)
    L2_deposits = []

    eligible_deposits = []
    n_eligible_deposits = []
    for deposit in t_l2_deposits:
        if time.time() - deposit["timestamp"] >= 300:
            eligible_deposits.append(deposit)
        else:
            n_eligible_deposits.append(deposit)

    # put not eligible deposits back
    L2_deposits += n_eligible_deposits

    # send off eligible array
    try:
        data = {
        "action":"L2_DEPOSIT",
        "deposits":str(eligible_deposits),
        "secret":keysConfigDict["adminSecret"]
        }
        response = requests.post(BASE_URL + "admin", json=data)
        print(response)
        print("L2 Deposit request success")
    except:
        # if deposit request fails, then add eligible deposits to L2 deposits again
        print("L2 Deposit request failed")
        L2_deposits += eligible_deposits
    print("Leftover Deposits", L2_deposits)

def add_l2_deposit(user, amount):
    global L2_deposits
    L2_deposits.append({
        "user":str(user),
        "amount":str(amount),
        "timestamp": time.time()
    })

def confirm_user_registration(user):
    data = {
        "action":"L1_REGISTERED",
        "user": str(user),
        "secret":keysConfigDict["adminSecret"]
    }
    response = requests.post(BASE_URL + "admin", json=data)
    print("L1 registered request success")

def loadConfigs():
    with open('contracts.json') as json_file:
        global contractsConfigDict
        data = json.load(json_file)
        contractsConfigDict = data
    with open('keys.json') as json_file:
        global keysConfigDict
        data = json.load(json_file)
        keysConfigDict = data
    # print contract configs
    print("Contract configs")
    for key in contractsConfigDict:
        print(f'{key} : {contractsConfigDict[key]}')
    print("Contract configs END")
    

'''
DEPOSIT EVENT
'''
def ws_deposit_message(ws, message):
    # print("WebSocket thread: %s" % message)
    print("**************** NEW DEPOSIT EVENT *******************")
    print("MESSAGE \n", message,type(message))
    message_dict = json.loads(message)
    data_bytes = decode_hex(message_dict["params"]["result"]["data"])
    decoded_data = eth_abi.decode_abi(['uint256', 'uint256', 'uint256', 'uint256'], data_bytes)
    print("DECODED DATA \n", decoded_data)
    add_l2_deposit(decoded_data[-2], decoded_data[-1])
    print("**************** ********** *******************")

def ws_deposit_open(ws):
    print("opened deposit thread")
    send_req = f'{{"jsonrpc":"2.0","id": 1,"method": "eth_subscribe","params": ["logs", {{"address": "{contractsConfigDict["starknetCoreContractAddress"]}","topics": ["0x474d2456b41fc1146ae05ba36e794e448efd2f172a9128ca1c8c6dbdb22b62f7","0x000000000000000000000000{contractsConfigDict["l1L2ContractAddress"][2:]}"]}}]}}'
    # print(f'send req deposit {send_req}')
    ws.send(send_req)

def ws_deposit_thread(*args):
    ws = websocket.WebSocketApp(f'wss://eth-goerli.alchemyapi.io/v2/{keysConfigDict["alchemyGoerliAPIKey"]}', on_open = ws_deposit_open, on_message = ws_deposit_message)
    ws.run_forever()

'''
REGISTER EVENT - NO MORE IN USE
'''
def ws_register_open(ws):
    print("opened register thread")
    send_req = f'{{"jsonrpc": "2.0","id": 2,"method": "eth_subscribe","params": ["logs", {{"address": "{contractsConfigDict["l1L2ContractAddress"]},"topics": ["0x007dc6ab80cc84c043b7b8d4fcafc802187470087f7ea7fccd2e17aecd0256a1"]}}]}}'
    ws.send(send_req)

def ws_register_message(ws, message):
    # print("WebSocket thread: %s" % message)
    print("**************** NEW REGISTER EVENT *******************")
    print("MESSAGE \n", message,type(message))
    message_dict = json.loads(message)
    user_hex = message_dict["params"]["result"]["topics"][-1]
    user_dec = int(user_hex, 16)
    print(f"Received L1 user registration event for {user_dec}")
    confirm_user_registration(user_dec)
    print("**************** ********** *******************")

def ws_register_thread(*args):
    ws = websocket.WebSocketApp(f'wss://eth-goerli.alchemyapi.io/v2/{keysConfigDict["alchemyGoerliAPIKey"]}', on_open = ws_register_open, on_message = ws_register_message)
    ws.run_forever()

def poll_deposits_thread():
    while True:
        send_eligible_l2_deposits()
        time.sleep(240)



loadConfigs()
BASE_URL = keysConfigDict["prodAPI"] if os.environ["env"] == "PRODUCTION" else keysConfigDict["devAPI"] 
# Start a new thread for the WebSocket interface
_thread.start_new_thread(ws_deposit_thread, ())
# _thread.start_new_thread(ws_register_thread, ())
_thread.start_new_thread(poll_deposits_thread, ())



# Continue other (non WebSocket) tasks in the main thread
while True:
    time.sleep(5)
    print("Main thread: %d" % time.time())


# def testing_deposit():
#     data = {
#         "action":"L2_DEPOSIT",
#         "deposits":str([{'user': '236674633417999769456764094354965200251110376610569403948542844693824382636', 'amount': '5000000000000000000', 'timestamp': 1632484029.149636}]),
#         "secret":SECRET_KEY
#     }
#     response = requests.post(BASE_URL + "admin", json=data)
#     print("L2 Deposit request success")

# testing_deposit()