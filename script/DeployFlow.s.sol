// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {PostRegistry} from "../src/PostRegistry.sol";

contract DeployFlow is Script {
    function run() external {
        vm.startBroadcast();

        PostRegistry postRegistry = new PostRegistry();
        console.log("PostRegistry deployed at:", address(postRegistry));

        vm.stopBroadcast();
    }
}
