# Blockchain-Based Software Licensing & Anti-Piracy System

This is a full-stack web application that provides a secure, decentralized marketplace for software developers to sell licenses to their products. It leverages blockchain technology (via an NFT-based licensing scheme) and modern web development practices to create a robust system that protects against piracy while offering a seamless experience for both sellers and buyers.

## Key Features

- **Secure User Authentication**: Users can create an account with a username, email, and password. Account recovery is secured by a 12-word security phrase, ensuring users always have control over their accounts.
- **Seller Dashboard**: Authenticated users can upload their software, set a price in Polygon (POL), define licensing rules (like device-locking), and track sales and license statuses in real-time.
- **Automated Encryption**: Software files are automatically encrypted on the server (using AES-256) before being uploaded to IPFS, ensuring the raw files are never publicly exposed.
- **Decentralized Marketplace**: A public marketplace where buyers can browse, filter, and purchase software licenses using their cryptocurrency wallets.
- **Blockchain-Powered Licensing**: When a buyer purchases software, a unique NFT license is minted on the Polygon blockchain and transferred to their wallet. This NFT serves as an unforgeable proof of ownership.
- **Buyer License Management**: Buyers have a dedicated dashboard to view all their purchased licenses, see their status (active, blocked), and download the necessary license file to access the software.
- **Multi-Layered Security & Anti-Piracy**:
  - **Wallet Lock**: The software can only be downloaded if the user is connected with the wallet that owns the license NFT.
  - **Device Lock**: The license is automatically bound to the first device it's used on, preventing users from sharing their license files with others.
  - **On-Chain Verification**: The system performs a real-time check with the smart contract to ensure the user still owns the NFT and that the license has not been revoked by the seller.
- **Secure File Delivery**: A dedicated page allows buyers to upload their license file, which triggers a secure, automated process of fetching the encrypted data from IPFS, decrypting it in the browser, and delivering the original, usable file to the buyer.

---

## How It Works: The Core Logic

The entire system revolves around a secure, three-part process:

**Step 1: The Seller Uploads Software**
*   A seller uploads their software file (e.g., a `.zip`, `.exe`, or `.txt` file).
*   The server generates a unique encryption key and uses it to encrypt the file with the **AES-256 algorithm**.
*   This **encrypted file** is then uploaded to the **InterPlanetary File System (IPFS)**, a decentralized storage network.
*   The software's details, the IPFS link, and the secret decryption key are stored securely in the MongoDB database.

**Step 2: The Buyer Purchases a License**
*   The buyer connects their MetaMask wallet and confirms the payment for the software.
*   A request is sent to the **Solidity smart contract** on the Polygon blockchain to **mint a new NFT license**.
*   This NFT is an unforgeable digital token that is transferred to the buyer's wallet, giving them permanent proof of ownership.
*   A record of the purchase (linking the software, buyer's wallet, and NFT token ID) is saved in the database.

**Step 3: The Buyer Accesses the Software**
*   The buyer downloads a small `.license.json` file from their dashboard. This file acts as a "keycard"—it doesn't contain the software, just the information needed to request it.
*   They upload this keycard to the "Access & Download" page.
*   The application performs all security checks:
    1.  Does the buyer's connected wallet own the license?
    2.  Is the device ID correct (if device lock is enabled)?
    3.  Does the license NFT still exist and belong to the user on the blockchain?
*   If all checks pass, the server sends back the secret **decryption key**.
*   The application then fetches the encrypted file from IPFS, decrypts it in the browser using the key, and prompts the user to save the original, usable file to their computer.

---

## Technical Workflow: A Functional Breakdown

### 1. User Authentication Flow
- **`src/app/signup/page.tsx`**: The UI for creating an account. The `handleContinue()` function temporarily saves credentials in `sessionStorage`.
- **`src/lib/auth.ts` (`createUser`)**: The backend function that receives the final signup data. It hashes the password and security phrase using **`bcrypt`** and saves the new user to MongoDB.
- **`src/lib/auth.ts` (`signInWithEmailPassword`)**: When a user signs in, this function finds the user by email and compares the entered password against the stored hash using `bcrypt.compare()`.

### 2. Software Upload Flow (Seller)
- **`src/app/dashboard/upload/page.tsx`**: The seller's upload form.
  - **`generateSecureKey()`**: Runs in the browser to create a new, random 256-bit encryption key when a file is selected.
  - **`handleSubmit()`**: Bundles all the software metadata and the file into a `FormData` object and sends it to the backend.
- **`src/app/api/upload/route.ts`**: The API endpoint that handles the upload.
  - **`encryptAndUploadToPinata()`**: This is the core of the upload security. It takes the original file, encrypts it with the generated key using **AES-256**, and uploads only the **encrypted blob** to IPFS. It returns the secure IPFS URL.
  - **`uploadSoftware()`**: After encryption, this function saves all the software metadata, the IPFS URL, and the secret **decryption key** to the MongoDB 'software' collection.

### 3. Software Purchase Flow (Buyer)
- **`src/app/marketplace/page.tsx`**: The public marketplace.
  - **`handleConfirmPurchase()`**: This function orchestrates the entire on-chain purchase. It first uploads the NFT's metadata (name, description) to IPFS. Then, it calls the `mintLicense` function on the smart contract, attaching the payment (`value`). This creates an **atomic transaction**—either the payment and minting both succeed, or they both fail, ensuring user funds are safe.
- **`src/lib/auth.ts` (`recordLicensePurchase`)**: Once the blockchain transaction is confirmed, this function saves a record of the sale (linking the software, the buyer's wallet, and the new NFT's token ID) into the MongoDB 'licenses' collection.

### 4. Software Access Flow (Buyer)
- **`src/app/buyer/page.tsx`**: The "My Licenses" dashboard.
  - **`handleDownloadLicenseFile()`**: Creates and downloads the `.license.json` file. This file is just a ticket—it contains IDs but **no sensitive keys**.
- **`src/app/run/page.tsx`**: The "Access & Download" page.
  - **`handleLoadSoftware()`**: When the license file is uploaded, this function reads it and calls the backend to get the decryption key.
- **`src/lib/auth.ts` (`getDecryptionKey`)**: The most critical security function. It performs a multi-step verification:
  1.  **DB Check**: Verifies the license exists and is active.
  2.  **Wallet Check**: Confirms the connected MetaMask wallet is the original buyer.
  3.  **Device Check**: Confirms the browser's device ID matches the one from the first download.
  4.  **Blockchain Check**: Makes a live call to the Polygon network to confirm the user still owns the license NFT.
  5. If all checks pass, it returns the decryption key.
- **`src/app/run/page.tsx` (`decryptData`)**: The final step. The browser fetches the encrypted file from IPFS, decrypts it locally using the key, and prompts the user to download the original, now-usable file.

---

## Technology Stack

- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS with ShadCN UI components for a modern, responsive design.
- **Database**: MongoDB
- **Blockchain**: Polygon (Amoy Testnet) for NFT minting.
- **Smart Contract Language**: Solidity
- **Blockchain Interaction**: Ethers.js
- **File Storage**: IPFS (via Pinata) for decentralized, permanent storage of encrypted files.
- **Encryption**: CryptoJS (AES-256) for robust encryption.
- **Authentication**: Custom solution using bcrypt for hashing passwords and security phrases.

---

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account or a local MongoDB instance.
- A [Pinata](https://www.pinata.cloud/) account to manage IPFS uploads.
- [MetaMask](https://metamask.io/) browser extension for blockchain interactions.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Chayapathi077/blockchain-based-software-licensing-and-piracy-prevention-system.git
    cd blockchain-based-software-licensing-and-piracy-prevention-system
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root of your project and add the following variables.

    ```env
    # MongoDB Connection String (use the public one for client-side access too)
    MONGODB_URI="your_mongodb_connection_string"
    NEXT_PUBLIC_MONGODB_URI="your_mongodb_connection_string"

    # Pinata API Keys (for uploading files to IPFS)
    PINATA_API_KEY="your_pinata_api_key"
    PINATA_SECRET_API_KEY="your_pinata_secret_key"

    # Polygon Amoy Testnet RPC URL (get from Alchemy or Infura)
    NEXT_PUBLIC_AMOY_RPC_URL="your_amoy_rpc_url"

    # Smart Contract Details
    NEXT_PUBLIC_SOFTWARE_LICENSE_CONTRACT_ADDRESS="your_deployed_contract_address"
    # The private key of the wallet that will pay gas fees to revoke licenses (must be the contract owner)
    SELLER_PRIVATE_KEY="your_wallet_private_key"

    # Nodemailer Configuration (for sending password recovery emails)
    # Example using Gmail, but can be any SMTP server
    EMAIL_SERVER_HOST="smtp.gmail.com"
    EMAIL_SERVER_PORT=465
    EMAIL_SERVER_USER="your_email@gmail.com"
    EMAIL_SERVER_PASSWORD="your_gmail_app_password"
    EMAIL_FROM="your_email@gmail.com"
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Smart Contract

The Solidity smart contract (`SoftwareLicense.sol`) is a standard ERC-721 (NFT) contract with a few extra functions:
- A `mintLicense` function to create a new license.
- A `revokeLicense` function that allows the contract owner to burn an NFT.
- A `tokenURI` function to point to the license metadata on IPFS.

You can use a standard ERC-721 template from OpenZeppelin and deploy it to the Polygon Amoy testnet using tools like Remix or Hardhat. After deployment, place the new contract address in your `.env` file.

---

## Deployment

This application is configured for easy deployment to **Firebase App Hosting**.

1.  **Install Firebase CLI:**
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login to Firebase:**
    ```bash
    firebase login
    ```

3.  **Initialize Firebase in your project:**
    ```bash
    firebase init hosting
    ```
    - Select an existing Firebase project or create a new one.
    - When prompted for the public directory, enter `.next`.
    - Configure as a single-page app (rewrite all URLs to /index.html)? **No**.
    - Set up automatic builds and deploys with GitHub? **(Optional)**

4.  **Deploy:**
    ```bash
    firebase deploy --only hosting
    ```
    Firebase will build and deploy your Next.js application.
```