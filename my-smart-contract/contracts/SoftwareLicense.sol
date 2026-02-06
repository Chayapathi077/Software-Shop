// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "hardhat/console.sol";


contract SoftwareLicense is ERC721, Ownable, ERC721URIStorage {
    uint256 private _nextTokenId;

    // Mapping from token ID to whether the license is blocked
    mapping(uint256 => bool) private _isBlocked;

    // Mapping from token ID to the associated IP address hash
    mapping(uint256 => string) private _ipAddressLock;

    event LicenseBlockedStatusChanged(uint256 indexed tokenId, bool isBlocked);
    event LicenseValidated(uint256 indexed tokenId, address indexed owner, string ipAddress, bool isValid);

    constructor(address initialOwner)
        ERC721("SoftwareLicense", "SFTL")
        Ownable(initialOwner)
    {}

    /**
     * @dev Overrides the internal _update function to make tokens non-transferable (soulbound).
     * This allows minting (from address 0) and burning (to address 0), but blocks all other transfers.
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721URIStorage)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("This license is non-transferable.");
        }
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev See {IERC721-approve}.
     *
     * This function is overridden to prevent approvals, reinforcing the non-transferable nature of the token.
     */
    function approve(address, uint256) public virtual override {
        revert("This license is non-transferable and cannot be approved for transfer.");
    }
    
    /**
     * @dev See {IERC721-setApprovalForAll}.
     *
     * This function is overridden to prevent approvals, reinforcing the non-transferable nature of the token.
     */
    function setApprovalForAll(address, bool) public virtual override {
        revert("This license is non-transferable and cannot be approved for transfer.");
    }

    /**
     * @dev Mints a new license NFT and assigns it to the buyer.
     * The license is created with a unique token URI and can be locked to an IP address.
     * @param buyer The address of the wallet receiving the license.
     * @param _tokenURI The URI for the token's metadata.
     * @param ipAddress The IP address to lock the license to (optional).
     */
    function mintLicense(address buyer, string memory _tokenURI, string memory ipAddress)
        public
        onlyOwner
        returns (uint256)
    {
        uint256 tokenId = _nextTokenId++;
        _mint(buyer, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        if (bytes(ipAddress).length > 0) {
            _ipAddressLock[tokenId] = ipAddress;
        }
        
        return tokenId;
    }

    /**
     * @dev Revokes a license by burning the associated NFT. Can only be called by the contract owner.
     * This is the only way a token can be "transferred" to the zero address.
     * @param tokenId The ID of the token to burn.
     */
    function revokeLicense(uint256 tokenId) public onlyOwner {
        require(_exists(tokenId), "Cannot revoke a non-existent license.");
        _burn(tokenId);
    }


    /**
     * @dev Toggles the blocked status of a license. Can only be called by the contract owner.
     * @param tokenId The ID of the license to block or unblock.
     * @param isBlocked The new blocked status.
     */
    function blockLicense(uint256 tokenId, bool isBlocked) public onlyOwner {
        _isBlocked[tokenId] = isBlocked;
        emit LicenseBlockedStatusChanged(tokenId, isBlocked);
    }

    /**
     * @dev Checks if a license is currently blocked.
     * @param tokenId The ID of the license to check.
     * @return bool True if the license is blocked, false otherwise.
     */
    function isLicenseBlocked(uint256 tokenId) public view returns (bool) {
        return _isBlocked[tokenId];
    }
    
    /**
     * @dev Retrieves the IP address lock associated with a license.
     * @param tokenId The ID of the license.
     * @return string The IP address the license is locked to.
     */
    function getLicenseIpLock(uint256 tokenId) public view returns (string memory) {
        return _ipAddressLock[tokenId];
    }

    /**
     * @dev Validates a license against its owner and, if applicable, an IP address.
     * Emits a {LicenseValidated} event.
     * @param tokenId The ID of the license to validate.
     * @param ipAddress The IP address to validate against.
     * @return bool True if the license is valid, false otherwise.
     */
    function validateLicense(uint256 tokenId, string memory ipAddress) public view returns (bool) {
        require(_exists(tokenId), "License does not exist.");
        
        address owner = ownerOf(tokenId);
        bool isIpLocked = bytes(_ipAddressLock[tokenId]).length > 0;

        bool isValid = !_isBlocked[tokenId] && (!isIpLocked || keccak256(bytes(_ipAddressLock[tokenId])) == keccak256(bytes(ipAddress)));
        
        emit LicenseValidated(tokenId, owner, ipAddress, isValid);
        return isValid;
    }

    /**
     * @dev See {IERC721-tokenURI}.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://";
    }
}
