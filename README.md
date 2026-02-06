# Blockchain-Based Software Licensing & Anti-Piracy System

This is a full-stack web application that provides a secure, decentralized marketplace for software developers to sell licenses to their products. It leverages blockchain technology (via an NFT-based licensing scheme) and modern web development practices to create a robust system that protects against piracy while offering a seamless experience for both sellers and buyers.

## Key Features

- **Secure User Authentication**: Users can create an account with a username, email, and password. Account recovery is secured by a 12-word security phrase, ensuring users always have control over their accounts.
- **Seller Dashboard**: Authenticated users can upload their software, set a price in Polygon (POL), define licensing rules, and track sales and license statuses.
- **Automated Encryption**: Software files are automatically encrypted (AES-256) on the server before being uploaded to IPFS, ensuring the raw files are never publicly exposed.
- **Marketplace**: A public marketplace where buyers can browse, filter, and purchase software licenses.
- **Blockchain-Powered Licensing**: When a buyer purchases software, a unique NFT license is minted on the Polygon Amoy testnet and transferred to their wallet. This NFT serves as an unforgeable proof of ownership.
- **Buyer License Management**: Buyers have a dedicated dashboard to view all their purchased licenses, see their status, and download the necessary license file to run the software.
- **Multi-Layered Security & Anti-Piracy**:
  - **Wallet Lock**: The software can only be run if the user connects the wallet that owns the license NFT.
  - **Device Fingerprinting**: The license is automatically bound to the first device it's used on, preventing users from sharing their license files with others.
  - **On-Chain Verification**: The system performs a real-time check with the smart contract to ensure the user still owns the NFT and that the license has not been revoked.
- **Secure Software Execution**: A dedicated "Run" page allows buyers to load their license file, which triggers a secure, automated process of fetching, decrypting, and displaying the software content entirely within the browser.

---

## How It Works: The Core Logic

1.  **Seller Uploads Software**:
    - A seller uploads their software file (e.g., a `.zip` or `.exe`).
    - The server generates a unique encryption key.
    - The file is encrypted using this key.
    - The **encrypted** file is uploaded to **IPFS** (via Pinata).
    - The software details, the IPFS URL, and the decryption key are stored securely in the database.

2.  **Buyer Purchases a License**:
    - The buyer connects their MetaMask wallet and pays the price.
    - A request is sent to the smart contract to **mint a new NFT license**.
    - The NFT is transferred to the buyer's wallet.
    - A record of the purchase (linking the software, buyer, and NFT token ID) is saved in the database.

3.  **Buyer Runs the Software**:
    - The buyer downloads a small `.license.json` file from their dashboard. This file acts as a "ticket".
    - They upload this ticket to the "Run" page.
    - The application reads the ticket, connects to the user's wallet, and sends a validation request to the server.
    - The server performs all security checks:
        - Is the license in the database marked as 'active'?
        - Does the user's wallet own the corresponding NFT on the blockchain?
        - Is the device ID correct?
    - If all checks pass, the server sends back the **decryption key**.
    - The application then fetches the **encrypted file** from IPFS, decrypts it in the browser using the key, and presents the content to the user.

---

## Technology Stack

- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS with ShadCN UI components for a modern, responsive design.
- **Database**: MongoDB
- **Blockchain**: Polygon (Amoy Testnet) for NFT minting.
- **Smart Contract Language**: Solidity
- **Blockchain Interaction**: Ethers.js
- **File Storage**: IPFS (via Pinata) for decentralized, permanent storage of encrypted files.
- **Encryption**: CryptoJS (AES-256) for robust client-side and server-side encryption.
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
    # MongoDB Connection String
    NEXT_PUBLIC_MONGODB_URI="your_mongodb_connection_string"

    # Pinata API Keys (for uploading files to IPFS)
    PINATA_API_KEY="your_pinata_api_key"
    PINATA_SECRET_API_KEY="your_pinata_secret_key"

    # Polygon Amoy Testnet RPC URL (get from Alchemy or Infura)
    NEXT_PUBLIC_AMOY_RPC_URL="your_amoy_rpc_url"

    # Smart Contract Details
    NEXT_PUBLIC_SOFTWARE_LICENSE_CONTRACT_ADDRESS="your_deployed_contract_address"
    # The private key of the account that will pay gas fees to revoke licenses (must be the contract owner)
    NEXT_PUBLIC_SELLER_PRIVATE_KEY="your_wallet_private_key"

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

The Solidity smart contract (`SoftwareLicense.sol`) is not included in this repository but is a standard ERC-721 (NFT) contract with a few extra functions:
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

Now you can commit this file and push your project to GitHub. It will have a great starting point for anyone who visits your repository

    