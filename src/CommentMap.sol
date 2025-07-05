// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract CommentMap {
    mapping(string => string[]) public s_postToComments;

    event CommentAdded(
        string indexed postBlobId,
        string commentBlobId,
        address indexed commenter
    );

    function addComment(
        string memory postBlobId,
        string memory commentBlobId
    ) external {
        s_postToComments[postBlobId].push(commentBlobId);
        emit CommentAdded(postBlobId, commentBlobId, msg.sender);
    }

    function getComments(
        string memory postBlobId
    ) external view returns (string[] memory) {
        return s_postToComments[postBlobId];
    }
}
