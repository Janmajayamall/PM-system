pragma solidity ^0.8.0;

import "./IERC20.sol";

interface IStarknetCore {
    /**
      Sends a message to an L2 contract.
    */
    function sendMessageToL2(
        uint256 to_address,
        uint256 selector,
        uint256[] calldata payload
    ) external;

    /**
      Consumes a message that was sent from an L2 contract.
    */
    function consumeMessageFromL2(uint256 fromAddress, uint256[] calldata payload) external;
}

/**
  Demo contract for L1 <-> L2 interaction between an L2 StarkNet contract and this L1 solidity
  contract.
*/
contract L1L2Trial {

    IERC20 fakeUSD = IERC20(0x5FbDB2315678afecb367f032d93F642f64180aa3);
 
    /**
      Initializes the contract state.
    */

    function depositUSDC(uint256 amount, uint256 user) public {
        uint256 balance0 = fakeUSD.balanceOf(address(this));
        fakeUSD.transferFrom(msg.sender, address(this), amount);
        uint256 balance1 = fakeUSD.balanceOf(address(this));
        require(balance1-balance0 == amount);
    }
}