import time
import pickle
import atexit
import ast
import copy
import asyncio
import json
import random
import os
from starkware.starknet.services.api.feeder_gateway.feeder_gateway_client import FeederGatewayClient
from starkware.starknet.services.api.gateway.gateway_client import GatewayClient
from starkware.starknet.compiler.compile import get_selector_from_name
from starkware.starknet.compiler.compile import get_selector_from_name
from starkware.starknet.services.api.gateway.transaction import Deploy, InvokeFunction
from flask import Flask
from flask_restful import Api, Resource, reqparse, abort, fields, marshal_with, request
from pymongo import MongoClient
from services.external_api.base_client import RetryConfig
from starkware.starkware_utils.error_handling import StarkErrorCode
from starkware.starknet.compiler.compile import compile_starknet_files
from starkware.cairo.lang.vm.crypto import async_pedersen_hash_func
from starkware.starknet.business_logic.internal_transaction import (
    InternalDeploy,
    InternalInvokeFunction,
)
from starkware.starknet.business_logic.internal_transaction_interface import (
    TransactionExecutionInfo,
)
from starkware.starknet.business_logic.state import CarriedState, SharedState
from starkware.starknet.business_logic.state_objects import ContractCarriedState, ContractState
from starkware.starknet.definitions import fields
from starkware.starknet.definitions.general_config import StarknetGeneralConfig
from starkware.starknet.services.api.contract_definition import ContractDefinition, EntryPointType
from starkware.storage.dict_storage import DictStorage
from starkware.storage.storage import FactFetchingContext
from typing import List, Optional, Union
from collections import defaultdict
from starkware.crypto.signature.signature import (verify)
from flask_cors import CORS
from pymongo import ReturnDocument
from starkware.crypto.signature.signature import (pedersen_hash, private_to_stark_key, sign)

app = Flask(__name__)
cors = CORS(app, resources={r"*": {"origins": "*"}})
api = Api(app)

parser = reqparse.RequestParser()

global contractsConfigDict
global keysConfigDict

class Starknet:
    """
    Reference - starkware.starknet.testing.starknet import Starknet
    Refer to it for additional info
    """
    def __init__(self, state: CarriedState, general_config: StarknetGeneralConfig):
        self.state = state
        self.general_config = general_config
        self.tx_history = []
        self.contract_addresses = []

    def copy(self) -> "Starknet":
        return copy.deepcopy(self)

    @classmethod
    async def empty(self, contract_paths, general_config: Optional[StarknetGeneralConfig] = None) -> "Starknet":
        if general_config is None:
            general_config = StarknetGeneralConfig()
        ffc = FactFetchingContext(storage=DictStorage(), hash_func=async_pedersen_hash_func)
        empty_contract_state = await ContractState.empty(
            storage_commitment_tree_height=general_config.contract_storage_commitment_tree_height,
            ffc=ffc,
        )
        empty_contract_carried_state = ContractCarriedState(
            state=empty_contract_state, storage_updates={}
        )
        shared_state = await SharedState.empty(ffc=ffc, general_config=general_config)
        state = CarriedState.empty(shared_state=shared_state, ffc=ffc)
        state.contract_states = defaultdict(lambda: copy.deepcopy(empty_contract_carried_state))
        
        # create starknet instance
        starknet = Starknet(state=state, general_config=general_config)
        for index, path in enumerate(contract_paths):
            contract_definition = compile_starknet_files([path], debug_info=True)
            contract_address = await starknet.deploy(contract_definition=contract_definition, contract_address=f'0x{index+1}')
            starknet.contract_addresses.append(contract_address)
        tx_list = starknet.load_pickle_txs()
        await starknet.store_historical_state(tx_list)
        print("******************* Local starknet instance intialized *******************")
        return starknet

    async def deploy(
        self,
        contract_definition: ContractDefinition,
        contract_address: Optional[Union[int, str]] = None,
    ) -> int:
        if contract_address is None:
            contract_address = fields.ContractAddressField.get_random_value()
        if isinstance(contract_address, str):
            contract_address = int(contract_address, 16)
        assert isinstance(contract_address, int)

        tx = InternalDeploy(
            contract_address=contract_address, contract_definition=contract_definition
        )

        with self.state.copy_and_apply() as state_copy:
            await tx.apply_state_updates(state=state_copy, general_config=self.general_config)
        return contract_address

    async def invoke_raw(
        self,
        contract_address: Union[int, str],
        selector: Union[int, str],
        calldata: List[int],
        call: bool = False,
        initialization: bool = False,
        entry_point_type: EntryPointType = EntryPointType.EXTERNAL,
    ) -> TransactionExecutionInfo:
        if isinstance(contract_address, str):
            contract_address = int(contract_address, 16)
        assert isinstance(contract_address, int)

        if isinstance(selector, str):
            selector = get_selector_from_name(selector)
        assert isinstance(selector, int)

        tx = InternalInvokeFunction(
            contract_address=contract_address,
            entry_point_selector=selector,
            entry_point_type=entry_point_type,
            calldata=calldata,
        )

        with self.state.copy_and_apply() as state_copy:
            response = await tx.apply_state_updates(
                state=state_copy, general_config=self.general_config
            )

            # Don't track txs where initialization is true (already trackes txs)
            # or call is true (such txs don't cause any state update @view txs)
            if initialization == False and call == False:
                # store tx history
                self.tx_history.append({
                    "contract_address":contract_address,
                    "selector":selector,
                    "calldata":calldata
                })
                self.dump_pickle_txs()
            return response

    def dump_pickle_txs(self):
        open_file = open("tx_history.pkl", "wb")
        pickle.dump(self.tx_history, open_file)
        open_file.close()
    
    def load_pickle_txs(self):
        # replay historical txs
        print("*******************************************")
        try:
            open_file = open("tx_history.pkl", "rb")
            tx_list = pickle.load(open_file)
            print("Past txs exist")
            open_file.close()
            return tx_list
        except:
            print("Past txs do not exist")
        print("*******************************************")
        return []
        
    async def store_historical_state(self, tx_list):
        '''
        If tx list is of len 0, initialize fn tx is added 
        since deployed contract is already initialized.
        Otherwise, tx list is executed as it is.
        '''        
        if len(tx_list) == 0:
            initialize_tx = {
                "contract_address":'1', 
                "selector": get_selector_from_name("initialize"),
                "calldata": [private_to_stark_key(int(keysConfigDict["l2OwnerPvKey"], 16)), int(contractsConfigDict["l1L2ContractAddress"], 16)]
            }
            tx_list.append(initialize_tx)

        # replay all transactions to bring new contract's state up to date
        print("*******************************************")
        print("At present txs")
        print(tx_list)
        print("*******************************************")
        for tx in tx_list:
            await self.invoke_raw(tx["contract_address"], tx["selector"], tx["calldata"], initialization=True)
        # store history 
        self.tx_history = tx_list

class Connector():
    def __init__(self, abi_path, address, network, starknet_simulator):
        # contract specific configurations
        with open(abi_path) as f:
            self.abi = json.load(f)
        try:
            self.address = int(address, 16)
        except ValueError:
            raise ValueError(f"Invalid address format: {address}.")

        # gateway client
        dns = "alpha2.starknet.io"
        retry_config = RetryConfig(n_retries=1)
        self.gateway_client = GatewayClient(url=f"https://{dns}/gateway", retry_config=retry_config)
        self.feeder_gateway_client = FeederGatewayClient(url=f"https://{dns}/feeder_gateway", retry_config=retry_config)
        self.loop = asyncio.get_event_loop()
        self.starknet_simulator = starknet_simulator

    async def invoke_or_call(self, args, call=False):
        # convert inputs
        inputs = []
        for value in args["inputs"]:
            try:
                inputs.append(int(value, 16) if value.startswith("0x") else int(value))
            except ValueError:
                raise ValueError(
                    f"Invalid input value: '{value}'. Expected a decimal or hexadecimal integer."
                )

        # check input validity
        for abi_entry in self.abi:
            if abi_entry["type"] == "function" and abi_entry["name"] == args["function"]:
                previous_felt_input = None
                current_inputs_ptr = 0
                for input_desc in abi_entry["inputs"]:
                    if input_desc["type"] == "felt":
                        assert current_inputs_ptr < len(
                            inputs
                        ), f"Expected at least {current_inputs_ptr + 1} inputs, got {len(inputs)}."

                        previous_felt_input = inputs[current_inputs_ptr]
                        current_inputs_ptr += 1
                    elif input_desc["type"] == "felt*":
                        assert previous_felt_input is not None, (
                            f'The array argument {input_desc["name"]} of type felt* must be preceded '
                            "by a length argument of type felt."
                        )

                        current_inputs_ptr += previous_felt_input
                        previous_felt_input = None
                    else:
                        raise Exception(f'Type {input_desc["type"]} is not supported.')
                break
        else:
            raise Exception(f"Function not found.")

        selector = get_selector_from_name(args["function"])
        assert (
            len(inputs) == current_inputs_ptr
        ), f"Wrong number of arguments. Expected {current_inputs_ptr}, got {len(inputs)}."
        calldata = inputs

        # simulate transaction
        simulation_response = await self.starknet_simulator.invoke_raw(
            contract_address=self.starknet_simulator.contract_addresses[0], selector=args["function"], calldata=inputs, call=call
        )

        # return simulation_response.retdata # TODO - REMOVE THIS
        
        # if function call is to l1_handlers or initialize fn or view functions (i.e. call === True), then return right away
        if args["function"]=="deposit" or args["function"]=="initialize" or call == True: 
            print(f"""\
               Function - {args["function"]} 
               Call value - {call}
               Tx will not be sent to starknet. Returning simulation response.
            """)
            return simulation_response.retdata

        tx = InvokeFunction(contract_address=self.address, entry_point_selector=selector, calldata=calldata)
        gateway_response: dict
        if call: # this is useless since call txs won't reach here
            block_id = None
            try:
                block_id = args["block_id"]
            except:
                block_id = None
            gateway_response = await self.feeder_gateway_client.call_contract(tx, block_id)
            print(f'call response - {gateway_response["result"]}')
        else:
            gateway_response = await self.gateway_client.add_transaction(tx=tx)
            assert (
                gateway_response["code"] == StarkErrorCode.TRANSACTION_RECEIVED.name
            ), f"Failed to send transaction. Response: {gateway_response}."
            # Don't end sentences with '.', to allow easy double-click copy-pasting of the values.
            print(
                f"""\
            Invoke transaction was sent.
            Contract address: 0x{self.address:064x}
            Transaction ID: {gateway_response['tx_id']}"""
            )
            print(f'invoke response - {gateway_response["tx_id"]}')

        return simulation_response.retdata

    def invoke(self, args):
        return self.loop.run_until_complete(self.invoke_or_call(args))
    
    def call(self, args):
        return self.loop.run_until_complete(self.invoke_or_call(args, True))

class Database():
    def __init__(self):
        CONNECTION_STRING = keysConfigDict["mongodbConnectionStringProd"] if os.environ["env"] == "PRODUCTION" else keysConfigDict["mongodbConnectionStringDev"] 
        self.client = MongoClient(CONNECTION_STRING)
        self.main_db = self.client["main_db"]
        self.markets_coll = self.main_db["markets"]
        self.bets_coll = self.main_db["bets"]
        self.markets_metadata_coll = self.main_db["markets_metadata"]
        self.balances_coll = self.main_db["balances"]
        self.l1_registered_coll = self.main_db["l1_registered"]

        # base contract connector
        self.base_connector = None

    '''
    Helper functions
    '''
    # Not collision resistant
    def string_hash(string):
        count = 0
        for c in string:
            count += ord(c)
        return pedersen_hash(count)

    def convert_dict_vals_to_str(self, d):
        new_dict = {}
        for key, value in d.items():
            new_dict[key] = str(value)
        return new_dict

    def strip_object_id(self, obj):
        if obj["_id"] is not None:
            del obj["_id"]
        return obj
    
    def market_arr_to_obj(self, arr, add_keys=None):
        obj = {
            "market_id": arr[0],
            "market_identifier": arr[1],
            "timestamp": arr[2],
            "state": arr[3],
            "total_volume": arr[4],
            "total_up": arr[5],
            "total_down": arr[6],
            "ruling": arr[7],      
        }
        if add_keys is not None:
            for key in add_keys:
                obj[key]=add_keys[key]
        return obj
    
    async def create_connector(self, contract_paths, abi_path, contract_address):
        # preparing the simulator
        starknet_simulator = await Starknet.empty(contract_paths)
        # creating the connector
        self.base_connector = Connector(abi_path, contract_address, "alpha", starknet_simulator)
        return
    '''
    END Helper functions
    '''
    
    '''
    DB functions
    '''
    def _db_update_market(self, arr, add_fields=None):
        str_dict = self.convert_dict_vals_to_str({
            "market_id": arr[0],
            "market_identifier": arr[1],
            "timestamp": arr[2],
            "state": arr[3],
            "total_volume": arr[4],
            "total_up": arr[5],
            "total_down": arr[6],
            "ruling": arr[7],      
        })

        if add_fields is not None:
            for key in add_fields:
                str_dict[key]=add_fields[key]

        res = self.markets_coll.find_one_and_update({
            "market_id": str_dict["market_id"]
        }, {"$set": str_dict}, upsert=True, return_document=ReturnDocument.AFTER)
        return self.strip_object_id(res)
    
    def _db_update_bet(self, arr):
        str_dict = self.convert_dict_vals_to_str({
            "market_id":arr[0],
            "user":arr[1],
            "amount":arr[2],
            "direction":arr[3],
        })
        res = self.bets_coll.find_one_and_update({
            "user": str_dict["user"],
            "market_id": str_dict["market_id"]
        }, {"$set": str_dict}, upsert=True, return_document=ReturnDocument.AFTER)
        return self.strip_object_id(res)
    
    def _db_delete_bet(self, arr):
        str_dict = self.convert_dict_vals_to_str({
            "user":arr[0],
            "market_id":arr[1]
        })
        self.bets_coll.delete_many({
            "user":str_dict["user"],
            "market_id":str_dict["market_id"]
        })
    
    def _db_update_balance(self, arr):
        str_dict = self.convert_dict_vals_to_str({
            "user":arr[0],
            "amount":arr[1]
        })
        res = self.balances_coll.find_one_and_update({
            "user":str_dict["user"]
        }, {"$set": str_dict}, upsert=True, return_document=ReturnDocument.AFTER)
        return self.strip_object_id(res)

    def _db_check_twitter_username(self, username):
        res = self.markets_coll.find_one({
            "twitter_username":username.lower()
        })
        print("Result of whether username exists or not: ", res)
        if res is None:
            return True
        return False
    '''
    END DB functions
    '''

    '''
    State view functions
    '''
    def handle_view_balance(self, user):
        return self.base_connector.call({
            "function":"view_balance",
            "inputs": [user],
        })
    
    def handle_view_balance_json(self, user):
        arr = self.handle_view_balance(user)
        return self.convert_dict_vals_to_str({
            "user":arr[0],
            "amount":arr[1]
        })
    
    def handle_view_market(self, market_id):
        return self.base_connector.call({
            "function":"view_market",
            "inputs": [market_id],
        })

    
    def handle_view_market_json(self, market_id):
        # calling db so that twitter_username is included
        res = self.markets_coll.find_one({
            "market_id":market_id
        })
        if res is not None:
            return self.strip_object_id(res)
        return
    
    def handle_view_bet(self, user, market_id):
        return self.base_connector.call({
            "function":"view_bet",
            "inputs": [market_id, user],
        })
    
    def handle_view_bet_json(self, user, market_id):
        arr = self.handle_view_bet(user, market_id)
        return self.convert_dict_vals_to_str({
            "market_id":arr[0],
            "user":arr[1],
            "amount":arr[2],
            "direction":arr[3],
        })
    
    def handle_view_owner(self):
        return self.base_connector.call({
            "function":"view_owner",
            "inputs":[]
        })
    
    def handle_view_all_bets(self, user):
        cursor = self.bets_coll.find({
            "user": user
        })
        bets = []
        for document in cursor:
            del document["_id"]
            bets.append(document)            
        return bets

    def handle_view_all_markets(self):
        cursor = self.markets_coll.find({})
        markets = []
        for document in cursor:
            del document["_id"]
            markets.append(document)
        return markets

    def handle_view_l1_registration(self, user):
        res = self.l1_registered_coll.find_one({
            "user":user
        })
        if res is not None:
            return {
                "registered":True
            }
        return {
            "registered":False
        }
    '''
    END State view functions
    '''

    '''
    State change functions
    '''
    def handle_add_market(self, market_details):
        timestamp = time.time()
        market_identifier = str(random.getrandbits(64))

        # add market on contract
        contract_res = self.base_connector.invoke({
            "function":"add_market",
            "inputs": [market_identifier],
        })

        # view state
        res_market = self.handle_view_market(str(contract_res[0]))

        # update db
        db_res_market = self._db_update_market(res_market, {"twitter_username":market_details["twitter_username"]})
        
        return db_res_market
    
    def handle_place_bet(self, user, market, bet, signature):
        # place bet in contract
        self.base_connector.invoke({
            "function":"place_bet",
            "inputs": [user, market["market_id"], bet["amount"], bet["direction"], signature["sig_r"], signature["sig_s"]],
        })

        # view state
        res_user = self.handle_view_balance(user)
        res_market = self.handle_view_market(market["market_id"])
        res_bet = self.handle_view_bet(user, market["market_id"])

        # update db
        db_res_user = self._db_update_balance(res_user)
        db_res_market = self._db_update_market(res_market)
        db_res_bet = self._db_update_bet(res_bet)

        return {
            "user":db_res_user,
            "market":db_res_market,
            "bet":db_res_bet
        }
    
    def handle_remove_bet(self, user, market, signature):
        # call the contract
        self.base_connector.invoke({
            "function":"remove_bet",
            "inputs": [user, market["market_id"], signature["sig_r"], signature["sig_s"]],
        })

        # view state
        res_user = self.handle_view_balance(user)
        res_market = self.handle_view_market(market["market_id"])

        # update db
        db_res_user = self._db_update_balance(res_user)
        db_res_market = self._db_update_market(res_market)
        self._db_delete_bet([res_user[0], res_market[0]])

        return {
            "user":db_res_user,
            "market":db_res_market
        }

    def handle_claim_reward(self, user, market):
        # call the contract
        self.base_connector.invoke({
            "function": "claim_rewards",
            "inputs":["1", market["market_id"], user]
        })

        # view state
        res_user = self.handle_view_balance(user)

        # update db
        db_res_user = self._db_update_balance(res_user)
        self._db_delete_bet([res_user[0], market["market_id"]])

        return {
            "user":db_res_user,
            "market":market
        }
    
    def handle_refund_bet(self, user, market):
        # call the contract
        self.base_connector.invoke({
            "function": "refund_bet",
            "inputs":[market["market_id"], user]
        })

        # view state
        res_user = self.handle_view_balance(user)

        # update db
        db_res_user = self._db_update_balance(res_user)
        self._db_delete_bet([res_user[0], market["market_id"]])

        return {
            "user":db_res_user,
            "market":market
        }

    def handle_l2_withdrawal(self, user, amount):
        self.base_connector.invoke({
            "function":"withdrawal",
            "inputs:":[user, amount]
        })

        # view state
        res_user = self.handle_view_balance(user)

        # update db
        db_res_user = self._db_update_balance(res_user)

        return {
            "user":db_res_user
        }

    def handle_l2_deposit_event(self, user, amount):
        self.base_connector.invoke({
            "function":"deposit",
            "inputs": [contractsConfigDict["l1L2ContractAddress"], user, amount]
        })

        # view state
        res_user = self.handle_view_balance(user)

        # update db
        db_res_user = self._db_update_balance(res_user)
        
        return {
            "user":db_res_user
        }
    
    def handle_initialize(self):
        self.base_connector.invoke({
            "function":"initialize",
            "inputs": [str(private_to_stark_key(int(keysConfigDict["l2OwnerPvKey"], 16))), contractsConfigDict["l1L2ContractAddress"]]
        })
    '''
    END State change functions
    '''

    '''
    Functions restricted to admin
    '''
    def handle_change_market_to_resolving(self, market, signature):
        self.base_connector.invoke({
            "function":"change_market_to_resolving",
            "inputs": [market["market_id"], signature["sig_r"], signature["sig_s"]]
        })

        # view state
        res_market = self.handle_view_market(market["market_id"])
        
        # update db
        db_res_market = self._db_update_market(res_market)

        return {
            "market":db_res_market
        }
    
    def handle_change_market_to_expired(self, market, signature):
        self.base_connector.invoke({
            "function":"change_market_to_expired",
            "inputs": [market["market_id"], signature["sig_r"], signature["sig_s"]]
        })

        # view state
        res_market = self.handle_view_market(market["market_id"])
        
        # update db
        db_res_market = self._db_update_market(res_market)

        return {
            "market":db_res_market
        }
    
    def handle_resolve_market(self, market, signature):
        self.base_connector.invoke({
            "function":"resolve_market",
            "inputs":[market["market_id"], market["ruling"], signature["sig_r"], signature["sig_s"]]
        })

        # view state
        res_market = self.handle_view_market(market["market_id"])

        # update db
        db_res_market = self._db_update_market(res_market)

        return {
            "market":db_res_market
        }

    def handle_l1_registered(self, user):
        res = self.l1_registered_coll.find_one_and_update({
            "user": str(user)
        }, {"$set": {"user": str(user)}}, upsert=True, return_document=ReturnDocument.AFTER)
        return res
    '''
    END Functions restricted to admin
    '''

class Markets(Resource):
    def post(self):
        args = request.get_json()
        if args["action"] == "NEW_MARKET":
            market_details = args["market_details"]
            # checking whether market for twitter username already exists or not
            check_res = database._db_check_twitter_username(market_details["twitter_username"])
            if check_res == False:
                return {
                    "error":"market already exists for twitter username"
                }, 400
            # everything's good; create new market
            response = database.handle_add_market(market_details)
            return response
        elif args["action"] == "PLACE_BET":
            user = args["user"]
            market = args["market"]
            bet = args["bet"]
            signature = args["signature"]
            response = database.handle_place_bet(user, market, bet, signature)
            return response
        elif args["action"] == "REMOVE_BET":
            user = args["user"]
            market = args["market"]
            signature = args["signature"]
            response = database.handle_remove_bet(user, market, signature)
            return response
        elif args["action"] == "L2_WITHDRAWAL":
            user = args["user"]
            amount = args["amount"]
            response = database.handle_l2_withdrawal(user, amount)
            return response
        elif args["action"] == "CLAIM_REWARD":
            user = args["user"]
            market = args["market"]
            response = database.handle_claim_reward(user, market)
            return response
        elif args["action"] == "REFUND_BET":
            user = args["user"]
            market = args["market"]
            response = database.handle_refund_bet(user, market)
            return response
        else:   
            abort("ACTION NOT VALID")
        return True

class View(Resource):
    def post(self):
        args = request.get_json()
        if args["action"] == "VIEW_BALANCE":
            user = args["user"]
            response = database.handle_view_balance_json(user)
            return response
        elif args["action"] == "VIEW_USER_BETS":
            user = args["user"]
            response = database.handle_view_all_bets(user)
            return response
        elif args["action"] == "VIEW_ALL_MARKETS":
            response = database.handle_view_all_markets()
            return response
        elif args["action"] == "VIEW_MARKET":
            market = args["market"]
            response = database.handle_view_market_json(market["market_id"])
            if response is None:
                return {
                    "error":"Invalid market id"
                }, 400
            return response
        elif args["action"] == "VIEW_L1_REGISTRATION":
            user = args["user"]
            response = database.handle_view_l1_registration(user)
            return response
        elif args["action"] == "VIEW_OWNER":
            response = database.handle_view_owner()
            return response
        else:
            abort("ACTION NOT VALID")
        return True

    
class Admin(Resource):
    def post(self):
        args = request.get_json()
        if args["secret"] != keysConfigDict["adminSecret"]:
            abort("NOT VALID SECRET KEY")
        if args["action"] == "L2_DEPOSIT":
            deposits = ast.literal_eval(args["deposits"])
            for deposit in deposits:
                database.handle_l2_deposit_event(str(deposit["user"]), str(deposit["amount"]))  
        elif args["action"] == "TEST_DEPOSIT":
            deposit = args["deposit"]
            database.handle_l2_deposit_event(str(deposit["user"]), str(deposit["amount"]))  
        elif args["action"] == "CHANGE_TO_RESOLVING":
            market = args["market"]
            signature = args["signature"]
            response = database.handle_change_market_to_resolving(market, signature)
            return response
        elif args["action"] == "CHANGE_TO_EXPIRED":
            market = args["market"]
            signature = args["signature"]
            response = database.handle_change_market_to_expired(market, signature)
            return response
        elif args["action"] == "RESOLVE_MARKET":
            market = args["market"]
            signature = args["signature"]
            response = database.handle_resolve_market(market, signature)
            return response
        elif args["action"] == "L1_REGISTERED":
            user = args["user"]
            database.handle_l1_registered(user)
        else:  
            abort("ACTION NOT VALID")
        return True


api.add_resource(Admin, "/admin")
api.add_resource(View, "/view")
api.add_resource(Markets, "/markets")

def get_configs():
    global contractsConfigDict
    global keysConfigDict
    return contractsConfigDict, keysConfigDict

def load_configs():
    global contractsConfigDict
    global keysConfigDict
    with open('contracts.json') as json_file:
        contractsConfigDict = json.load(json_file)
    with open('keys.json') as json_file:
        keysConfigDict = json.load(json_file) 
    print("Contract configs")
    for key in contractsConfigDict:
        print(f'{key} : {contractsConfigDict[key]}')
    for key in keysConfigDict:
        print(f'{key} : {keysConfigDict[key]}')
    print("Contract configs END")
    

load_configs()
database = Database()
loop = asyncio.get_event_loop()
loop.run_until_complete(database.create_connector(["main_sim.cairo"], "generated/main_sim_abi.json", contractsConfigDict["l2ContractAddress"]))

if __name__ == "__main__":
    pass
    