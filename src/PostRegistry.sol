// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract PostRegistry {
    struct PostMetadata {
        address author;
        string title;
        string summary;
        uint256 timestamp;
        string[] mediaLinks;
    }

    mapping(uint256 postCount => PostMetadata postMetadata) public s_posts;
    mapping(address author => uint256[] postNum) public s_postsByAuthor;
    uint256 public s_postCount;

    event PostCreated(
        uint256 indexed postId,
        address indexed author,
        string title,
        string summary,
        uint256 timestamp
    );

    function createPost(
        address author,
        string memory title,
        string memory summary,
        string[] memory mediaLinks
    ) external {
        s_posts[s_postCount] = PostMetadata(
            author,
            title,
            summary,
            block.timestamp,
            mediaLinks
        );

        s_postsByAuthor[author].push(s_postCount);

        emit PostCreated(s_postCount, author, title, summary, block.timestamp);
        s_postCount++;
    }

    function getPostsByAuthor(
        address author
    ) external view returns (uint256[] memory) {
        return s_postsByAuthor[author];
    }
}
