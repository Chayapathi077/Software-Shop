// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SoftwareLicense
 * @dev An ERC721 token contract for issuing and managing software licenses.
 * Each token represents a unique, non-transferable license.
 */
contract SoftwareLicense is ERC721, Ownable {

    // Counter for the next token ID to be minted.
    uint256 private _nextTokenId;

    // Mapping from token ID to the IP address lock, if any.
    mapping(uint256 => string) private _licenseIpLock;
    
    // Mapping from token ID to its blocked status.
    mapping(uint256 => bool) private _isLicenseBlocked;

    /**
     * @dev Sets the initial owner of the contract.
     */
    constructor(address initialOwner)
        ERC721("SoftwareLicense", "SLT")
        Ownable(initialOwner)
    {}

    /**
     * @dev Mints a new license token and assigns it to a buyer.
     * Can only be called by the contract owner.
     * @param buyer The address of the recipient of the new license.
     * @param tokenURI_ The URI for the token's metadata.
     * @param ipAddress The IP address to lock the license to (can be empty).
     * @return The ID of the newly minted token.
     */
    function mintLicense(address buyer, string memory tokenURI_, string memory ipAddress)
        public
        onlyOwner
        returns (uint256)
    {
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;
        _safeMint(buyer, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        if (bytes(ipAddress).length > 0) {
            _licenseIpLock[tokenId] = ipAddress;
        }
        return tokenId;
    }
    
    /**
     * @dev Overrides the default ERC721 _update function to enforce non-transferability.
     * Allows transfers only during minting (from address 0) and burning (to address 0).
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0)) { // This is not a mint operation
             require(to == address(0), "Tokens are non-transferable and can only be burned.");
        }
        return super._update(to, tokenId, auth);
    }


    /**
     * @dev Revokes (burns) a license token.
     * Can only be called by the contract owner.
     * @param tokenId The ID of the token to revoke.
     */
    function revokeLicense(uint256 tokenId) public onlyOwner {
        require(_exists(tokenId), "ERC721: token nonexistent");
        _burn(tokenId);
    }
    
    /**
     * @dev Sets the blocked status of a license.
     * Can only be called by the contract owner.
     * @param tokenId The ID of the token.
     * @param isBlocked The new blocked status.
     */
    function blockLicense(uint256 tokenId, bool isBlocked) public onlyOwner {
        _isLicenseBlocked[tokenId] = isBlocked;
        emit LicenseBlockedStatusChanged(tokenId, isBlocked);
    }
    
    /**
     * @dev Validates a license against the owner and an optional IP address.
     * @param tokenId The ID of the token to validate.
     * @param ipAddress The IP address to check against the lock.
     * @return True if the license is valid, false otherwise.
     */
    function validateLicense(uint256 tokenId, string memory ipAddress)
        public
        view
        returns (bool)
    {
        require(_exists(tokenId), "License does not exist.");

        if (_isLicenseBlocked[tokenId]) {
            return false;
        }

        string memory ipLock = _licenseIpLock[tokenId];
        if (bytes(ipLock).length > 0) {
            if (keccak256(bytes(ipLock)) != keccak256(bytes(ipAddress))) {
                return false;
            }
        }
        return true;
    }

    // Getter functions to view license properties.
    function getLicenseIpLock(uint256 tokenId) public view returns (string memory) {
        return _licenseIpLock[tokenId];
    }
    
    function isLicenseBlocked(uint256 tokenId) public view returns (bool) {
        return _isLicenseBlocked[tokenId];
    }

    // Event emitted when a license's blocked status changes.
    event LicenseBlockedStatusChanged(uint256 indexed tokenId, bool isBlocked);
    // Event for logging license validation attempts.
    event LicenseValidated(uint256 indexed tokenId, address indexed owner, string ipAddress, bool isValid);
}
