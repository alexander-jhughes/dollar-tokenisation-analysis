// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OilTradeSettlement {
    address public buyer;
    address public seller;
    IERC20 public cashToken;
    IERC20 public oilToken;
    uint256 public cashAmount;
    uint256 public oilAmount;
    bool public cashDeposited;
    bool public oilDeposited;
    uint256 public deadline;

    enum Status { Pending, Settled, Refunded }
    Status public status;

    mapping(address => bool) public allowlist;

    constructor(
        address _buyer,
        address _seller,
        address _cashToken,
        address _oilToken,
        uint256 _cashAmount,
        uint256 _oilAmount,
        uint256 _durationSeconds
    ) {
        buyer = _buyer;
        seller = _seller;
        cashToken = IERC20(_cashToken);
        oilToken = IERC20(_oilToken);
        cashAmount = _cashAmount;
        oilAmount = _oilAmount;
        deadline = block.timestamp + _durationSeconds;
        status = Status.Pending;

        allowlist[_buyer] = true;
        allowlist[_seller] = true;
    }

    function deposit() external {
        require(status == Status.Pending, "Trade not pending");
        require(allowlist[msg.sender], "Not allowlisted");
        if (msg.sender == buyer) {
            require(!cashDeposited, "Cash already deposited");
            cashToken.transferFrom(msg.sender, address(this), cashAmount);
            cashDeposited = true;
        } else if (msg.sender == seller) {
            require(!oilDeposited, "Oil already deposited");
            oilToken.transferFrom(msg.sender, address(this), oilAmount);
            oilDeposited = true;
        } else {
            revert("Not buyer or seller");
        }
    }

    function settle() external {
        require(status == Status.Pending, "Trade not pending");
        require(cashDeposited && oilDeposited, "Both legs not deposited");
        require(allowlist[buyer] && allowlist[seller], "Compliance check failed");
        status = Status.Settled;
        cashToken.transfer(seller, cashAmount);
        oilToken.transfer(buyer, oilAmount);
    }

    function refund() external {
        require(status == Status.Pending, "Trade not pending");
        require(block.timestamp >= deadline, "Deadline not reached");
        require(!(cashDeposited && oilDeposited), "Trade already fully funded, cannot refund");
        status = Status.Refunded;
        if (cashDeposited) {
            cashToken.transfer(buyer, cashAmount);
        }
        if (oilDeposited) {
            oilToken.transfer(seller, oilAmount);
        }
    }
}
