// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {IIdentityVerificationHubV2} from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";
import {SelfStructs} from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";
import {AttestationId} from "@selfxyz/contracts/contracts/constants/AttestationId.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Formatter} from "@selfxyz/contracts/contracts/libraries/Formatter.sol";

contract Customization is SelfVerificationRoot, Ownable {
    // app-specific configuration ID
    bytes32 public configId;

    // Age over 55 or less 18

    // enum UserType {
    //     RESTRICTED_MINOR_MALE, // 0
    //     RESTRICTED_MINOR_FEMALE, // 1
    //     RESTRICTED_ADULT_MALE, // 2
    //     RESTRICTED_ADULT_FEMALE, // 3
    //     RESTRICTED_SENIOR_MALE, // 4
    //     RESTRICTED_SENIOR_FEMALE, // 5
    //     MINOR_MALE, // 6
    //     MINOR_FEMALE, // 7
    //     ADULT_MALE, // 8
    //     ADULT_FEMALE, // 9
    //     SENIOR_MALE, // 10
    //     SENIOR_FEMALE // 11
    // }

    // If the user skip the verification, we will set the user type to 12 => Restricted Minor Unknown

    uint8 public UserType;

    enum AgeRange {
        MINOR, // 0-18
        ADULT, // 18-55
        SENIOR // 55+
    }

    mapping(address user => uint8 userType) public s_userType;
    mapping(address user => string nationality) public s_userNationality;
    string[] public restrictedNationalities;

    event VerificationDone(address userAddress);

    constructor(
        address _identityVerificationHubV2, // V2 Hub address
        uint256 _scope, // Application-specific scope identifier
        string[] memory _restrictedNationalities // List of restricted nationalities
    )
        SelfVerificationRoot(_identityVerificationHubV2, _scope)
        Ownable(msg.sender)
    {
        restrictedNationalities = _restrictedNationalities;
    }

    function setConfigId(bytes32 _configId) external onlyOwner {
        configId = _configId;
    }

    // Required: Override to provide configId for verification
    // We don't verify stuffs, we customize stuffs
    function getConfigId(
        bytes32 /*destinationChainId*/,
        bytes32 /*userIdentifier*/,
        bytes memory /*userDefinedData*/ // Custom data from the qr code configuration
    ) public pure override returns (bytes32) {
        // Return app's configuration ID
        return
            0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61;
    }

    function setScope(uint256 _scope) external onlyOwner {
        // Update the scope in the parent contract
        _setScope(_scope);
    }

    // Override to handle successful verification
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal virtual override {
        _decideUserType(output, userData);
        emit VerificationDone(uint256ToAddress(output.userIdentifier));
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function uint256ToAddress(
        uint256 _uint256
    ) internal pure returns (address) {
        return address(uint160(_uint256));
    }

    function _decideUserType(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory /*userData*/
    ) internal {
        uint8 userType;

        string memory userGender = output.gender;
        bool isRestricted = _isRestrictedNationality(output.nationality);
        AgeRange ageRange = _decideAgeRange(output.dateOfBirth);

        if (
            keccak256(abi.encodePacked(userGender)) ==
            keccak256(abi.encodePacked("M"))
        ) {
            if (isRestricted) {
                if (ageRange == AgeRange.MINOR) {
                    userType = 0;
                } else if (ageRange == AgeRange.ADULT) {
                    userType = 2;
                } else {
                    userType = 4;
                }
            } else {
                if (ageRange == AgeRange.MINOR) {
                    userType = 6; // Under 18, not restricted
                } else if (ageRange == AgeRange.ADULT) {
                    userType = 8; // 18-55, not restricted
                } else {
                    userType = 10; // 55+, not restricted
                }
            }
        } else {
            if (isRestricted) {
                if (ageRange == AgeRange.MINOR) {
                    userType = 1; // Under 18, restricted
                } else if (ageRange == AgeRange.ADULT) {
                    userType = 3; // 18-55, restricted
                } else {
                    userType = 5; // 55+, restricted
                }
            } else {
                if (ageRange == AgeRange.MINOR) {
                    userType = 7; // Under 18, not restricted
                } else if (ageRange == AgeRange.ADULT) {
                    userType = 9; // 18-55, not restricted
                } else {
                    userType = 11; // 55+, not restricted
                }
            }
        }

        // Store the user type in the mapping
        s_userType[uint256ToAddress(output.userIdentifier)] = userType;
        s_userNationality[uint256ToAddress(output.userIdentifier)] = output
            .nationality;
    }

    function _decideAgeRange(
        string memory dateOfBirth
    ) internal view returns (AgeRange) {
        bytes memory dobBytes = bytes(dateOfBirth);
        require(dobBytes.length == 8, "Invalid DOB format"); // "DD-MM-YY" = 8 chars

        // Extract day and month from "DD-MM-YY" format
        string memory day = Formatter.substring(dateOfBirth, 0, 2); // DD
        string memory month = Formatter.substring(dateOfBirth, 3, 5); // MM (skip hyphen)
        string memory year = Formatter.substring(dateOfBirth, 6, 8); // YY

        // Create the date after 18 years
        string memory dobAfter18Years = string(
            abi.encodePacked(year, month, day)
        );

        uint256 dobAfter18YearsTimestamp = Formatter.dateToUnixTimestamp(
            dobAfter18Years
        );

        // Create the date after 55 years
        string memory dobAfter55Years = string(
            abi.encodePacked(year, month, day)
        );

        uint256 dobAfter55YearsTimestamp = Formatter.dateToUnixTimestamp(
            dobAfter55Years
        );

        uint256 currentTime = block.timestamp;

        if (currentTime < dobAfter18YearsTimestamp) {
            return AgeRange.MINOR; // Under 18
        } else if (
            currentTime >= dobAfter18YearsTimestamp &&
            currentTime < dobAfter55YearsTimestamp
        ) {
            return AgeRange.ADULT; // 18-55
        } else {
            return AgeRange.SENIOR; // 55+
        }
    }

    function _isRestrictedNationality(
        string memory nationality
    ) internal view returns (bool) {
        for (uint256 i = 0; i < restrictedNationalities.length; i++) {
            if (
                keccak256(abi.encodePacked(restrictedNationalities[i])) ==
                keccak256(abi.encodePacked(nationality))
            ) {
                return true; // Found a match
            }
        }
        return false; // No match found
    }
}
