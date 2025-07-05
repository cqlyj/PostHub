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
    enum UserType {
        RESTRICTED_MINOR_MALE,
        RESTRICTED_MINOR_FEMALE,
        RESTRICTED_ADULT_MALE,
        RESTRICTED_ADULT_FEMALE,
        RESTRICTED_SENIOR_MALE,
        RESTRICTED_SENIOR_FEMALE,
        MINOR_MALE,
        MINOR_FEMALE,
        ADULT_MALE,
        ADULT_FEMALE,
        SENIOR_MALE,
        SENIOR_FEMALE
    }

    enum AgeRange {
        MINOR, // 0-18
        ADULT, // 18-55
        SENIOR // 55+
    }

    mapping(bytes world => UserType userType) public worldUserType;
    mapping(bytes world => string nationality) public worldNationality;
    string[] public restrictedNationalities;

    event VerificationDone(
        bytes userData // Custom data => Unique ID for the from the World Mini App
    );

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
    function getConfigId(
        bytes32 /*destinationChainId*/,
        bytes32 /*userIdentifier*/,
        bytes memory /*userDefinedData*/ // Custom data from the qr code configuration
    ) public view override returns (bytes32) {
        // Return app's configuration ID
        return configId;
    }

    function setScope(uint256 _scope) external onlyOwner {
        // Update the scope in the parent contract
        _setScope(_scope);
    }

    // Override to handle successful verification
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData // Custom data => Unique ID for the from the World Mini App
    ) internal virtual override {
        _decideUserType(output, userData);
        emit VerificationDone(userData);
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _decideUserType(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal {
        UserType userType;

        string memory userGender = output.gender;
        bool isRestricted = _isRestrictedNationality(output.nationality);
        AgeRange ageRange = _decideAgeRange(output.dateOfBirth);

        if (
            keccak256(abi.encodePacked(userGender)) ==
            keccak256(abi.encodePacked("M"))
        ) {
            if (isRestricted) {
                if (ageRange == AgeRange.MINOR) {
                    userType = UserType.RESTRICTED_MINOR_MALE; // Under 18, restricted
                } else if (ageRange == AgeRange.ADULT) {
                    userType = UserType.RESTRICTED_ADULT_MALE; // 18-55, restricted
                } else {
                    userType = UserType.RESTRICTED_SENIOR_MALE; // 55+, restricted
                }
            } else {
                if (ageRange == AgeRange.MINOR) {
                    userType = UserType.MINOR_MALE; // Under 18, not restricted
                } else if (ageRange == AgeRange.ADULT) {
                    userType = UserType.ADULT_MALE; // 18-55, not restricted
                } else {
                    userType = UserType.SENIOR_MALE; // 55+, not restricted
                }
            }
        } else {
            if (isRestricted) {
                if (ageRange == AgeRange.MINOR) {
                    userType = UserType.RESTRICTED_MINOR_FEMALE; // Under 18, restricted
                } else if (ageRange == AgeRange.ADULT) {
                    userType = UserType.RESTRICTED_ADULT_FEMALE; // 18-55, restricted
                } else {
                    userType = UserType.RESTRICTED_SENIOR_FEMALE; // 55+, restricted
                }
            } else {
                if (ageRange == AgeRange.MINOR) {
                    userType = UserType.MINOR_FEMALE; // Under 18, not restricted
                } else if (ageRange == AgeRange.ADULT) {
                    userType = UserType.ADULT_FEMALE; // 18-55, not restricted
                } else {
                    userType = UserType.SENIOR_FEMALE; // 55+, not restricted
                }
            }
        }

        // Store the user type in the mapping
        worldUserType[userData] = userType;
        worldNationality[userData] = output.nationality;
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
