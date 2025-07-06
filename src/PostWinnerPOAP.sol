// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

contract PostWinnerPOAP is ERC721, Ownable {
    // ------------------------------------------------------------------
    // STORAGE
    // ------------------------------------------------------------------

    uint256 private _nextTokenId = 1; // start from 1 for nicer UX

    string internal constant IMAGE_URL =
        "https://tnxlazzhdahkkfmoqboa.supabase.co/storage/v1/object/public/post-media//lucky.png";

    struct PoapData {
        uint256 week;
        uint256 likes;
        uint256 stars;
        uint256 postId;
    }

    mapping(uint256 => PoapData) private _poapDataById;

    // ------------------------------------------------------------------
    // CONSTRUCTOR
    // ------------------------------------------------------------------

    constructor() ERC721("PostWinner", "PWPOAP") Ownable(msg.sender) {}

    // ------------------------------------------------------------------
    // PUBLIC/EXTERNAL FUNCTIONS
    // ------------------------------------------------------------------

    /**
     * @notice Mint a new Post Winner POAP.
     * @dev Only contract owner (e.g. backend ops script) can mint.
     * @param to The address that will receive the POAP.
     * @param week The week number this POAP corresponds to.
     * @param likes Number of likes received that week.
     * @param stars Number of stars received that week.
     * @return tokenId The newly-minted token id.
     */
    function mintPoap(
        address to,
        uint256 week,
        uint256 likes,
        uint256 stars,
        uint256 postId
    ) external onlyOwner returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _poapDataById[tokenId] = PoapData({
            week: week,
            likes: likes,
            stars: stars,
            postId: postId
        });
    }

    /**
     * @notice Returns on-chain JSON metadata encoded as base64.
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        PoapData memory data = _poapDataById[tokenId];

        string memory json = string(
            abi.encodePacked(
                "{",
                '"name":"Post Winner #',
                Strings.toString(tokenId),
                '",',
                '"description":"Weekly Post Winner POAP Badge.",',
                '"image":"',
                IMAGE_URL,
                '",',
                '"attributes":[',
                '{"trait_type":"Week","value":"',
                Strings.toString(data.week),
                '"},',
                '{"trait_type":"Likes","value":"',
                Strings.toString(data.likes),
                '"},',
                '{"trait_type":"Stars","value":"',
                Strings.toString(data.stars),
                '"},',
                '{"trait_type":"Post ID","value":"',
                Strings.toString(data.postId),
                '"}',
                "]}"
            )
        );

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(bytes(json))
                )
            );
    }

    // ------------------------------------------------------------------
    // VIEW HELPERS
    // ------------------------------------------------------------------

    function getPoapData(
        uint256 tokenId
    ) external view returns (PoapData memory) {
        return _poapDataById[tokenId];
    }
}
