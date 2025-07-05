// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {PostRegistry} from "../src/PostRegistry.sol";
import {CommentMap} from "../src/CommentMap.sol";

contract DeployFlow is Script {
    function run() external {
        vm.startBroadcast();

        PostRegistry postRegistry = new PostRegistry();
        console.log("PostRegistry deployed at:", address(postRegistry));
        CommentMap commentMap = new CommentMap();
        console.log("CommentMap deployed at:", address(commentMap));

        vm.stopBroadcast();
    }
}
