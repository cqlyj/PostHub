// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract PostRegistry {
    struct PostMetadata {
        address author;
        string blobId; // Walrus blob hash
        string title;
        string summary;
        uint256 timestamp;
    }

    mapping(uint256 postCount => PostMetadata postMetadata) public s_posts;
    mapping(address author => uint256[] postNum) public s_postsByAuthor;
    uint256 public s_postCount;

    event PostCreated(
        uint256 indexed postId,
        address indexed author,
        string blobId,
        string title,
        string summary,
        uint256 timestamp
    );

    function createPost(
        string memory blobId,
        string memory title,
        string memory summary
    ) external {
        s_posts[s_postCount] = PostMetadata(
            msg.sender,
            blobId,
            title,
            summary,
            block.timestamp
        );

        s_postsByAuthor[msg.sender].push(s_postCount);

        emit PostCreated(
            s_postCount,
            msg.sender,
            blobId,
            title,
            summary,
            block.timestamp
        );
        s_postCount++;
    }

    function getPostsByAuthor(
        address author
    ) external view returns (uint256[] memory) {
        return s_postsByAuthor[author];
    }
}
