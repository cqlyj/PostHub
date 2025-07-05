// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {Customization} from "../src/Customization.sol";

contract Deploy is Script {
    // @TODO: Add restricted nationalities
    string[] restrictedNationalities = ["PRK", "IRN"];

    function run() external {
        vm.startBroadcast();

        // Deploy the Customization contract
        address customization = address(
            new Customization(
                0x68c931C9a534D37aa78094877F46fE46a49F1A51,
                0,
                restrictedNationalities
            )
        );
        console.log("Customization deployed at:", customization);

        vm.stopBroadcast();
    }
}
