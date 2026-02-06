// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract LicenseNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Mapping from token ID to the software ID it represents
    mapping(uint256 => uint256) public softwareIdOf;
    // Mapping from token ID to the license data (could be a JSON string or IPFS hash)
    mapping(uint256 => string) private _licenseData;

    constructor(address initialOwner)
        ERC721("SoftwareLicense", "SFTL")
        Ownable(initialOwner)
    {}

    function mintLicense(address buyer, uint256 softwareId, string memory licenseData)
        public
        onlyOwner
        returns (uint256)
    {
        _tokenIdCounter.increment();
        uint256 newTokenId = _tokenIdCounter.current();

        _safeMint(buyer, newTokenId);
        
        softwareIdOf[newTokenId] = softwareId;
        _licenseData[newTokenId] = licenseData;

        return newTokenId;
    }

    function getLicenseData(uint256 tokenId) public view returns (string memory) {
        require(_exists(tokenId), "ERC721: query for nonexistent token");
        return _licenseData[tokenId];
    }

    // The following functions are overrides required by Solidity.

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721)
    {
        super._increaseBalance(account, value);
    }
}
