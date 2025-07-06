// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {PostRegistry} from "../src/PostRegistry.sol";
import {MockUsdc} from "../src/MockUsdc.sol";
import {PostWinnerPOAP} from "../src/PostWinnerPOAP.sol";

contract DeployFlow is Script {
    function run() external {
        vm.startBroadcast();

        PostRegistry postRegistry = new PostRegistry();
        console.log("PostRegistry deployed at:", address(postRegistry));

        MockUsdc mockUsdc = new MockUsdc();
        console.log("MockUsdc deployed at:", address(mockUsdc));

        PostWinnerPOAP postWinnerPOAP = new PostWinnerPOAP();
        console.log("PostWinnerPOAP deployed at:", address(postWinnerPOAP));

        vm.stopBroadcast();
    }
}
