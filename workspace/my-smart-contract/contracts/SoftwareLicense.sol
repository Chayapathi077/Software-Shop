// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SoftwareLicense
 * @dev A smart contract for creating and managing software licenses as NFTs.
 * Each NFT represents a unique, verifiable license for a piece of software.
 * This contract includes anti-piracy features like IP locking and license blocking.
 */
contract SoftwareLicense is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    // Mapping from token ID to the IP address it's locked to (optional)
    mapping(uint256 => string) private _licenseIpLock;
    // Mapping from token ID to its blocked status
    mapping(uint256 => bool) private _isLicenseBlocked;

    event LicenseValidated(
        uint256 indexed tokenId,
        address indexed owner,
        string ipAddress,
        bool isValid
    );

    event LicenseBlockedStatusChanged(uint256 indexed tokenId, bool isBlocked);

    constructor(address initialOwner)
        ERC721("SoftwareLicense", "SFTL")
        Ownable(initialOwner)
    {}

    /**
     * @dev Mints a new license NFT and assigns it to a buyer.
     * Can only be called by the contract owner (the marketplace backend).
     * @param buyer The address of the software buyer.
     * @param _tokenURI The URI for the token's metadata.
     * @param ipAddress The buyer's IP address to lock the license to. Can be empty.
     * @return The ID of the newly minted token.
     */
    function mintLicense(address buyer, string memory _tokenURI, string memory ipAddress)
        public
        onlyOwner
        returns (uint256)
    {
        uint256 tokenId = _nextTokenId++;
        _safeMint(buyer, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        
        if (bytes(ipAddress).length > 0) {
            _licenseIpLock[tokenId] = ipAddress;
        }

        return tokenId;
    }
    
    /**
     * @dev Sets or clears the blocked status of a license.
     * Useful for sellers to manage licenses based on violations.
     * Can only be called by the contract owner.
     */
    function blockLicense(uint256 tokenId, bool isBlocked) public onlyOwner {
        _isLicenseBlocked[tokenId] = isBlocked;
        emit LicenseBlockedStatusChanged(tokenId, isBlocked);
    }
    
     /**
     * @dev Permanently revokes (burns) a license. Can be used by the seller.
     * Can only be called by the contract owner.
     */
    function revokeLicense(uint256 tokenId) public onlyOwner {
        // The _burn function requires the owner to be the one burning it,
        // but since we are the contract owner, we can bypass this by checking existence.
        require(_exists(tokenId), "ERC721: token nonexistent");
        _burn(tokenId);
    }

    /**
     * @dev Validates a license against an owner's address and IP.
     * This is a view function and does not cost gas to call.
     * @param tokenId The ID of the license token to validate.
     * @param ipAddress The IP address of the user attempting to use the software.
     * @return A boolean indicating if the license is valid for the given parameters.
     */
    function validateLicense(uint256 tokenId, string memory ipAddress)
        public
        view
        returns (bool)
    {
        require(_exists(tokenId), "ERC721: token nonexistent");
        address owner = ownerOf(tokenId);

        if (_isLicenseBlocked[tokenId]) {
            emit LicenseValidated(tokenId, owner, ipAddress, false);
            return false;
        }
        
        string memory lockedIp = _licenseIpLock[tokenId];
        if (bytes(lockedIp).length > 0) {
            if (keccak256(bytes(lockedIp)) != keccak256(bytes(ipAddress))) {
                emit LicenseValidated(tokenId, owner, ipAddress, false);
                return false;
            }
        }
        
        emit LicenseValidated(tokenId, owner, ipAddress, true);
        return true;
    }

    // Getter function to check the IP lock status of a license.
    function getLicenseIpLock(uint256 tokenId) public view returns (string memory) {
        return _licenseIpLock[tokenId];
    }
    
    // Getter function to check if a license is currently blocked.
    function isLicenseBlocked(uint256 tokenId) public view returns (bool) {
        return _isLicenseBlocked[tokenId];
    }

    // The following functions are overrides required by Solidity.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        // This is the core override to make tokens non-transferable (soulbound).
        // It allows minting (from address(0)) and burning (to address(0)),
        // but blocks any other transfer.
        if (ownerOf(tokenId) != address(0)) { // If the token already exists
            require(to == address(0), "SFTL: This license token is non-transferable.");
        }
        return super._update(to, tokenId, auth);
    }
    
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
