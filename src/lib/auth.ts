
'use server';

import bcrypt from 'bcrypt';
import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';
import { Contract, JsonRpcProvider } from 'ethers';
import { SOFTWARE_LICENSE_ABI } from './abi';


if (!process.env.NEXT_PUBLIC_MONGODB_URI) {
  throw new Error('Server configuration error: MONGODB_URI is not set in your .env file.');
}

const SOFTWARE_LICENSE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SOFTWARE_LICENSE_CONTRACT_ADDRESS || '0xa3BBFe67BA745F4A2b566fc31Cc0724Ead830938';


interface UserData {
  username: string;
  email: string;
  password?: string;
  securityPhrase?: string;
  panNumber?: string;
  walletAddress?: string;
}

interface CheckUserExistsParams {
    username?: string;
    email?: string;
}

interface LicenseData {
    softwareId: string;
    buyerAddress: string;
    tokenId: number;
    transactionHash: string;
    buyerIp: string;
}


/**
 * Checks if a username or email already exists in the database.
 * @param username The username to check.
 * @param email The email to check.
 * @returns An object indicating if the user exists and a corresponding message.
 */
export async function checkUserExists({ username, email }: CheckUserExistsParams): Promise<{ userExists: boolean; message: string }> {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    const query: { $or: Array<any> } = { $or: [] };
    if (username) query.$or.push({ username });
    if (email) query.$or.push({ email });

    if (query.$or.length === 0) {
        return { userExists: false, message: "" };
    }

    const existingUser = await db.collection('users').findOne(query);

    if (existingUser) {
      if (username && existingUser.username === username) {
        return { userExists: true, message: 'This username is already taken. Please choose another one.' };
      }
      if (email && existingUser.email === email) {
        return { userExists: true, message: 'An account with this email address already exists.' };
      }
    }
    return { userExists: false, message: '' };
  } catch (error) {
    console.error("Error checking user existence:", error);
    return { userExists: true, message: 'An unexpected server error occurred.' };
  }
}


/**
 * Creates a new user in the database with a hashed password and security phrase.
 * @param userData - The user data to create a new user.
 * @returns An object indicating success or failure.
 */
export async function createUser(userData: {username: string, email: string, password: string, securityPhrase: string, panNumber: string, walletAddress: string}): Promise<{ success: boolean; message: string }> {
  try {
    const { username, email, password, securityPhrase, panNumber, walletAddress } = userData;

    if (!username || !email || !password || !securityPhrase || !panNumber || !walletAddress) {
        return { success: false, message: 'All fields, including PAN and wallet address, are required.' };
    }

    const client = await clientPromise;
    const db = client.db();

    const userCheck = await checkUserExists({username, email});
    if (userCheck.userExists) {
      return { success: false, message: userCheck.message };
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const securityPhraseHash = await bcrypt.hash(securityPhrase, 10);
    const panNumberHash = await bcrypt.hash(panNumber, 10);
    
    const newUser: any = {
      username,
      email,
      passwordHash,
      securityPhraseHash,
      panNumberHash,
      walletAddress, // Stored in plain text as it's a public address
      createdAt: new Date(),
    };
    
    const result = await db.collection('users').insertOne(newUser);
    
    if (!result.insertedId) {
        return { success: false, message: 'Failed to create user in the database.' };
    }
    
    return { success: true, message: "User created successfully." };

  } catch (error) {
    console.error("Error creating user:", error);
    let message = 'An unexpected server error occurred. Please try again later.';
    if (error instanceof Error && error.message.includes('bad auth')) {
      message = 'Authentication failed. Please check your database credentials and ensure your server IP is whitelisted in MongoDB Atlas (allow access from anywhere: 0.0.0.0/0).';
    } else if (error instanceof Error) {
      message = error.message;
    }
    return { success: false, message };
  }
}

/**
 * Signs in a user with their email and password.
 * @param email The user's email address.
 * @param password The user's password.
 * @returns An object indicating success or failure.
 */
export async function signInWithEmailPassword(email: string, password: string): Promise<{ success: boolean; message: string; user?: { username: string; profileIcon?: string; walletAddress?: string;} }> {
    if (!email || !password) {
        return { success: false, message: 'Email and password are required.' };
    }

    try {
        const client = await clientPromise;
        const db = client.db();

        const user = await db.collection('users').findOne({ email: email }, { projection: { username: 1, passwordHash: 1, profileIcon: 1, walletAddress: 1 } });

        if (!user) {
            return { success: false, message: 'No account found with this email address.' };
        }
        
        if (!user.passwordHash) {
            return { success: false, message: 'Account is not set up correctly. No password hash found.' };
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (isPasswordValid) {
            return { success: true, message: 'Sign-in successful.', user: { username: user.username, profileIcon: user.profileIcon, walletAddress: user.walletAddress } };
        } else {
            return { success: false, message: 'Incorrect password.' };
        }
    } catch (error) {
        console.error("Error signing in with email:", error);
        return { success: false, message: 'An unexpected server error occurred during sign-in.' };
    }
}

/**
 * Fetches software uploaded by a specific user, including license stats.
 * @param username The username of the seller.
 * @returns A list of software objects with license statistics.
 */
export async function getMySoftware(username: string): Promise<any[]> {
    try {
        const client = await clientPromise;
        const db = client.db();

        const softwareList = await db.collection('software').find({ sellerUsername: username }).sort({ createdAt: -1 }).toArray();

        const softwareWithStats = await Promise.all(softwareList.map(async (software) => {
            const licenses = await db.collection('licenses').find({ softwareId: software._id }).toArray();
            const totalLicenses = licenses.length;
            const activeLicenses = licenses.filter(l => l.status === 'active').length;
            const blockedLicenses = licenses.filter(l => l.status === 'blocked').length;
            
            return {
                ...software,
                _id: software._id.toString(),
                sellerId: software.sellerId.toString(),
                totalLicenses,
                activeLicenses,
                blockedLicenses,
            };
        }));
        
        return softwareWithStats;
    } catch (error) {
        console.error("Error fetching software:", error);
        return [];
    }
}


/**
 * Fetches all software from the database for the marketplace.
 * This now includes the seller's wallet address.
 * @returns A list of all software objects.
 */
export async function getAllSoftware(): Promise<any[]> {
    try {
        const client = await clientPromise;
        const db = client.db();

        const softwareList = await db.collection('software').aggregate([
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'sellerId',
                    foreignField: '_id',
                    as: 'sellerInfo'
                }
            },
            {
                $unwind: {
                    path: '$sellerInfo',
                    preserveNullAndEmptyArrays: true 
                }
            },
            {
                $project: {
                    title: 1,
                    description: 1,
                    price: 1,
                    sellerUsername: 1,
                    fileUrl: 1,
                    createdAt: 1,
                    category: 1,
                    licenseType: 1,
                    licensingRules: 1,
                    sellerProfileIcon: '$sellerInfo.profileIcon',
                    sellerWalletAddress: '$sellerInfo.walletAddress',
                }
            }
        ]).toArray();

        return softwareList.map(s => ({
            ...s,
            _id: s._id.toString(),
        }));
    } catch (error) {
        console.error("Error fetching all software:", error);
        return [];
    }
}

/**
 * Fetches user profile information.
 * @param username The username to fetch profile for.
 * @returns The user profile object or null if not found.
 */
export async function getUserProfile(username: string): Promise<{ username: string; profileIcon: string | null; } | null> {
    try {
        const client = await clientPromise;
        const db = client.db();

        const user = await db.collection('users').findOne(
            { username: username },
            { projection: { username: 1, profileIcon: 1, _id: 0 } }
        );

        if (user) {
            return {
                username: user.username,
                profileIcon: user.profileIcon || null
            };
        }
        return null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

/**
 * Updates a user's profile.
 * @param username The username of the user to update.
 * @param profileData The data to update.
 * @returns An object indicating success or failure.
 */
export async function updateUserProfile(username: string, profileData: { profileIcon: string | null }): Promise<{ success: boolean; message: string }> {
  try {
    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection('users').updateOne(
      { username: username },
      { $set: { profileIcon: profileData.profileIcon } }
    );

    if (result.modifiedCount > 0) {
      return { success: true, message: 'Profile updated successfully.' };
    } else {
      return { success: false, message: 'User not found or profile is already up-to-date.' };
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, message: 'An unexpected server error occurred.' };
  }
}

/**
 * Sends a real recovery OTP via email and stores its hash in the database.
 * @param email The email to send the OTP to.
 * @returns A success or failure object.
 */
export async function sendRecoveryOtp(email: string): Promise<{ success: boolean; message: string }> {
    if (!process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
        console.error("Email service is not configured on the server. Please set EMAIL_SERVER_USER and EMAIL_SERVER_PASSWORD in your .env file.");
        return { success: false, message: "Email service is not configured on the server." };
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const user = await db.collection('users').findOne({ email });

        if (!user) {
            return { success: false, message: "No account found with this email." };
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

        await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { recoveryOtpHash: otpHash, recoveryOtpExpiry: otpExpiry } }
        );

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_SERVER_PORT || "465"),
            secure: true,
            auth: {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD,
            },
        });

        await transporter.sendMail({
            from: `"Software Shop" <${process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER}>`,
            to: email,
            subject: "Your Account Recovery Code",
            html: `
                <div style="font-family: sans-serif; text-align: center; padding: 20px;">
                    <h2>Software Shop Account Recovery</h2>
                    <p>Your one-time recovery code is:</p>
                    <p style="font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; background-color: #f0f0f0; padding: 10px; border-radius: 5px;">${otp}</p>
                    <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
                </div>
            `,
        });

        return { success: true, message: "A recovery code has been sent to your email." };
    } catch (error) {
        console.error("Error in sendRecoveryOtp:", error);
        return { success: false, message: "Failed to send recovery email. Please try again later." };
    }
}

/**
 * Verifies a recovery OTP against the hash stored in the database.
 * @param email The user's email.
 * @param otp The OTP to verify.
 * @returns An object indicating success or failure.
 */
export async function verifyRecoveryOtp(email: string, otp: string): Promise<{ success: boolean; message: string }> {
     try {
        const client = await clientPromise;
        const db = client.db();
        const user = await db.collection('users').findOne({ email });

        if (!user || !user.recoveryOtpHash || !user.recoveryOtpExpiry) {
            return { success: false, message: "No pending recovery request found for this account." };
        }
        
        if (new Date() > user.recoveryOtpExpiry) {
            // Clear expired OTP
             await db.collection('users').updateOne({ _id: user._id }, { $unset: { recoveryOtpHash: "", recoveryOtpExpiry: "" } });
            return { success: false, message: "The recovery code has expired. Please request a new one." };
        }
        
        const isOtpValid = await bcrypt.compare(otp, user.recoveryOtpHash);

        if (isOtpValid) {
            // Clear OTP after successful verification
            await db.collection('users').updateOne({ _id: user._id }, { $unset: { recoveryOtpHash: "", recoveryOtpExpiry: "" } });
            return { success: true, message: "OTP verified successfully." };
        } else {
            return { success: false, message: "Invalid recovery code." };
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return { success: false, message: "An unexpected server error occurred." };
    }
}

export async function recoverAccount(email: string, phrase: string): Promise<{ success: boolean; message: string }> {
    try {
        const client = await clientPromise;
        const db = client.db();
        const user = await db.collection('users').findOne({ email: email });

        if (!user || !user.securityPhraseHash) {
            return { success: false, message: "Account not found or no security phrase is set for it." };
        }

        const isPhraseValid = await bcrypt.compare(phrase, user.securityPhraseHash);
        
        if (isPhraseValid) {
            return { success: true, message: "Account verified." };
        } else {
            return { success: false, message: "The security phrase you entered is incorrect." };
        }
    } catch (error) {
        console.error("Error recovering account:", error);
        return { success: false, message: "An unexpected server error occurred during account recovery." };
    }
}

export async function resetPassword(email: string, newPassword: string):Promise<{ success: boolean; message: string }> {
     try {
        const client = await clientPromise;
        const db = client.db();
        
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        const result = await db.collection('users').updateOne(
            { email: email },
            { $set: { passwordHash: newPasswordHash } }
        );

        if (result.modifiedCount === 0) {
            return { success: false, message: "Could not find the user to update." };
        }

        return { success: true, message: "Password updated successfully." };
    } catch (error) {
        console.error("Error resetting password:", error);
        return { success: false, message: "An unexpected server error occurred." };
    }
}

/**
 * Deletes a user account and their associated software from the database.
 * @param username The username of the account to delete.
 * @returns An object indicating success or failure.
 */
export async function deleteUserAccount(username: string): Promise<{ success: boolean; message: string }> {
  if (!username) {
    return { success: false, message: "Username is required." };
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Find the user to get their ID
    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return { success: false, message: "User not found." };
    }

    // It's good practice to wrap deletions in a transaction if your database supports it
    // For simplicity, we'll perform sequential deletions.
    
    // 1. Delete all software uploaded by the user
    await db.collection('software').deleteMany({ sellerId: user._id });

    // 2. Delete the user account
    const result = await db.collection('users').deleteOne({ _id: user._id });

    if (result.deletedCount > 0) {
      return { success: true, message: "Account and all associated data deleted successfully." };
    } else {
      return { success: false, message: "Failed to delete the user account." };
    }
  } catch (error) {
    console.error("Error deleting user account:", error);
    return { success: false, message: "An unexpected server error occurred during account deletion." };
  }
}

/**
 * Records a license purchase in the database after a successful on-chain transaction.
 * @param licenseData The license data to record.
 * @returns An object indicating success or failure.
 */
export async function recordLicensePurchase(licenseData: LicenseData): Promise<{ success: boolean; message: string }> {
  const { softwareId, buyerAddress, tokenId, transactionHash, buyerIp } = licenseData;

  if (!softwareId || !buyerAddress || tokenId === undefined || !transactionHash) {
      return { success: false, message: "Missing required license data." };
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const software = await db.collection('software').findOne({ _id: new ObjectId(softwareId) });
    if (!software) {
      return { success: false, message: "The purchased software does not exist." };
    }

    const newLicense = {
      softwareId: software._id,
      softwareTitle: software.title,
      buyerAddress: buyerAddress.toLowerCase(),
      tokenId,
      transactionHash,
      mintDate: new Date(),
      buyerIp: buyerIp || "", // Store the IP if provided, otherwise empty string
      deviceId: "", // Initialize deviceId as empty
      status: 'active', // Initial status
    };

    await db.collection('licenses').insertOne(newLicense);

    return { success: true, message: "License purchase recorded successfully." };
  } catch (error) {
    console.error("Error recording license purchase:", error);
    return { success: false, message: "An unexpected server error occurred while recording the purchase." };
  }
}

/**
 * Fetches all licenses owned by a specific buyer.
 * @param buyerAddress The wallet address of the buyer.
 * @returns A list of license objects.
 */
export async function getLicensesForBuyer(buyerAddress: string): Promise<any[]> {
    if (!buyerAddress) {
        return [];
    }
    try {
        const client = await clientPromise;
        const db = client.db();

        const licenses = await db.collection('licenses').find({ buyerAddress: buyerAddress.toLowerCase() }).sort({ mintDate: -1 }).toArray();

        // Convert ObjectId to string for client-side usage
        return licenses.map(license => ({
            ...license,
            _id: license._id.toString(),
            softwareId: license.softwareId.toString(),
        }));
    } catch (error) {
        console.error("Error fetching licenses for buyer:", error);
        return [];
    }
}

// Helper function to send a violation email to the seller
async function sendViolationEmail(license: any) {
    if (!process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
        console.error("Email service is not configured for violation notifications.");
        return;
    }
    
    try {
        const client = await clientPromise;
        const db = client.db();
        
        const software = await db.collection('software').findOne({ _id: license.softwareId });
        if (!software) return;

        const seller = await db.collection('users').findOne({ _id: software.sellerId });
        if (!seller || !seller.email) return;

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_SERVER_PORT || "465"),
            secure: true,
            auth: {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD,
            },
        });

        await transporter.sendMail({
            from: `"Software Shop Security" <${process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER}>`,
            to: seller.email,
            subject: `[Security Alert] License for "${software.title}" has been blocked`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>License Blocked Notification</h2>
                    <p>Hello ${seller.username},</p>
                    <p>This is an automated alert to inform you that a license for your software, <strong>${software.title}</strong>, has been automatically blocked due to a security violation.</p>
                    <h3>Violation Details:</h3>
                    <ul>
                        <li><strong>Software:</strong> ${software.title}</li>
                        <li><strong>License Token ID:</strong> ${license.tokenId}</li>
                        <li><strong>Reason for Block:</strong> Device violation (attempted use on a new device).</li>
                        <li><strong>Buyer's Wallet:</strong> ${license.buyerAddress}</li>
                    </ul>
                    <p>The license is now inactive. You can review this license and choose to reactivate or permanently revoke it from your seller dashboard.</p>
                    <p>Thank you,<br/>The Software Shop Team</p>
                </div>
            `,
        });

    } catch(error) {
        console.error("Failed to send violation email:", error);
    }
}

/**
 * Binds a device ID to a license if it's not already bound to a different device.
 * @param licenseId The ID of the license.
 * @param deviceId The unique identifier of the device.
 * @returns An object indicating success or failure.
 */
export async function bindDeviceToLicense(licenseId: string, deviceId: string): Promise<{ success: boolean; message: string }> {
    if (!licenseId || !deviceId) {
        return { success: false, message: "License ID and Device ID are required." };
    }
    try {
        const client = await clientPromise;
        const db = client.db();
        
        if (!ObjectId.isValid(licenseId)) {
            return { success: false, message: "Invalid license ID format." };
        }
        
        const license = await db.collection('licenses').findOne({ _id: new ObjectId(licenseId) });
        if (!license) {
            return { success: false, message: "License not found." };
        }

        const software = await db.collection('software').findOne({ _id: license.softwareId });
        if (!software?.licensingRules.fingerprintLock) {
            // If fingerprint lock is not enabled for this software, there's nothing to do.
            return { success: true, message: "Device binding is not required for this license." };
        }

        if (license.deviceId && license.deviceId !== deviceId) {
            // This is a security violation. Return a specific error without blocking.
            return { success: false, message: "This license is already bound to another device." };
        }
        
        if (!license.deviceId) {
            // First time use, bind the device.
            const result = await db.collection('licenses').updateOne(
                { _id: new ObjectId(licenseId) },
                { $set: { deviceId: deviceId } }
            );
            if (result.modifiedCount > 0) {
                 return { success: true, message: "Device successfully bound to license." };
            }
        }
        
        return { success: true, message: "Device is already correctly bound." };
    } catch (error) {
        console.error("Error binding device to license:", error);
        return { success: false, message: "An unexpected server error occurred during device binding." };
    }
}

/**
 * Gets the encrypted file URL for a given software ID without any validation.
 * @param softwareId The ID of the software.
 * @returns An object with success status and the file URL or an error message.
 */
export async function getSoftwareFileUrl(softwareId: string): Promise<{ success: boolean; message: string; fileUrl?: string; }> {
    if (!softwareId || !ObjectId.isValid(softwareId)) {
        return { success: false, message: "Invalid software ID." };
    }
    try {
        const client = await clientPromise;
        const db = client.db();
        const software = await db.collection('software').findOne(
            { _id: new ObjectId(softwareId) },
            { projection: { fileUrl: 1 } }
        );

        if (!software || !software.fileUrl) {
            return { success: false, message: "Could not find the software file URL." };
        }
        
        return { success: true, message: "URL retrieved.", fileUrl: software.fileUrl };
    } catch (error) {
        console.error("Error in getSoftwareFileUrl:", error);
        return { success: false, message: "An unexpected server error occurred." };
    }
}


/**
 * Verifies a license and device, then returns a decryption key.
 * This function now includes a real-time smart contract check for NFT ownership.
 * @param licenseId The ID of the license.
 * @param deviceId The unique identifier of the device.
 * @param walletAddress The wallet address of the user.
 * @returns An object with success status and the key or an error message.
 */
export async function getDecryptionKey(licenseId: string, deviceId: string, walletAddress: string): Promise<{ success: boolean; message: string; key?: string; fileUrl?: string; }> {
  if (!licenseId || !deviceId || !walletAddress) {
    return { success: false, message: "License ID, Device ID, and Wallet Address are required." };
  }
  
  if (!process.env.NEXT_PUBLIC_AMOY_RPC_URL) {
      console.error("Server configuration error: NEXT_PUBLIC_AMOY_RPC_URL is not set.");
      return { success: false, message: "The server is not configured to communicate with the blockchain." };
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    if (!ObjectId.isValid(licenseId)) {
      return { success: false, message: "Invalid license ID format." };
    }

    const license = await db.collection('licenses').findOne({ _id: new ObjectId(licenseId) });

    if (!license) {
      return { success: false, message: "License not found in the database." };
    }
    
    // Primary check: license status in our DB. If blocked/revoked, fail fast.
    if (license.status !== 'active') {
        return { success: false, message: `License is not active. Current status: ${license.status}. Contact the seller for assistance.` };
    }

    const software = await db.collection('software').findOne({ _id: license.softwareId });
    if (!software) {
        return { success: false, message: "Could not find the associated software." };
    }
    
    // --- Smart Contract Validation ---
    const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_AMOY_RPC_URL);
    const contract = new Contract(SOFTWARE_LICENSE_CONTRACT_ADDRESS, SOFTWARE_LICENSE_ABI, provider);
    
    try {
        const ownerOfToken = await contract.ownerOf(license.tokenId);
        if (ownerOfToken.toLowerCase() !== walletAddress.toLowerCase()) {
            return { success: false, message: "Smart contract check failed: The connected wallet is not the owner of this license NFT." };
        }
    } catch(contractError: any) {
        console.error("Smart contract call error:", contractError);
        if (contractError.reason && contractError.reason.includes('invalid token ID')) {
             await db.collection('licenses').updateOne(
              { _id: new ObjectId(licenseId) },
              { $set: { status: 'revoked', reason: 'Token does not exist (burned)', lastViolationDate: new Date() } }
            );
            return { success: false, message: "This license has been revoked and no longer exists on the blockchain." };
        }
        return { success: false, message: "Could not verify license ownership on the blockchain." };
    }
    
    // DEVICE LOCK VALIDATION
    if (software.licensingRules.fingerprintLock) {
        if (license.deviceId && license.deviceId !== deviceId) {
            return { success: false, message: "Device mismatch. This license is not bound to this device." };
        }
    }

    if (!software.decryptionKey || !software.fileUrl) {
        return { success: false, message: "Could not find the software's decryption key or file URL." };
    }

    const decryptionKey = software.decryptionKey;
    const fileUrl = software.fileUrl;

    return { success: true, message: "Key retrieved successfully.", key: decryptionKey, fileUrl };

  } catch (error) {
    console.error("Error in getDecryptionKey:", error);
    return { success: false, message: "An unexpected server error occurred." };
  }
}

/**
 * Fetches all licenses for a specific software, intended for the seller's view.
 * @param softwareId The ID of the software.
 * @returns A list of license objects for that software.
 */
export async function getLicensesForSoftware(softwareId: string): Promise<any[]> {
    if (!softwareId || !ObjectId.isValid(softwareId)) {
        return [];
    }
    try {
        const client = await clientPromise;
        const db = client.db();

        const licenses = await db.collection('licenses')
            .find({ softwareId: new ObjectId(softwareId) })
            .sort({ mintDate: -1 })
            .toArray();

        return licenses.map(license => ({
            ...license,
            _id: license._id.toString(),
            softwareId: license.softwareId.toString(),
        }));
    } catch (error) {
        console.error("Error fetching licenses for software:", error);
        return [];
    }
}

/**
 * Revokes a license by burning the NFT and updating the database.
 * @param licenseId The ID of the license to revoke.
 * @returns An object indicating success or failure.
 */
export async function revokeLicense(licenseId: string): Promise<{ success: boolean; message: string }> {
    if (!process.env.NEXT_PUBLIC_SELLER_PRIVATE_KEY || !process.env.NEXT_PUBLIC_AMOY_RPC_URL) {
        return { success: false, message: "Server is not configured for blockchain transactions." };
    }
     if (!licenseId || !ObjectId.isValid(licenseId)) {
        return { success: false, message: "Invalid license ID." };
    }
    
    try {
        const client = await clientPromise;
        const db = client.db();

        const license = await db.collection('licenses').findOne({ _id: new ObjectId(licenseId) });
        if (!license) {
            return { success: false, message: "License not found." };
        }

        const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_AMOY_RPC_URL);
        const { Wallet } = await import('ethers');
        const signer = new Wallet(process.env.NEXT_PUBLIC_SELLER_PRIVATE_KEY, provider);
        const contract = new Contract(SOFTWARE_LICENSE_CONTRACT_ADDRESS, SOFTWARE_LICENSE_ABI, signer);

        const tx = await contract.revokeLicense(license.tokenId);
        await tx.wait();

        await db.collection('licenses').updateOne(
            { _id: new ObjectId(licenseId) },
            { $set: { status: 'revoked', reason: 'Seller revoked' } }
        );

        return { success: true, message: `License ${license.tokenId} has been permanently revoked.` };
    } catch (error: any) {
        console.error("Error revoking license:", error);
        return { success: false, message: `Failed to revoke license: ${error.reason || error.message}` };
    }
}

/**
 * Reactivates a "blocked" license by setting its status back to "active" in the database.
 * @param licenseId The ID of the license to reactivate.
 * @returns An object indicating success or failure.
 */
export async function reactivateLicense(licenseId: string): Promise<{ success: boolean; message:string }> {
     if (!licenseId || !ObjectId.isValid(licenseId)) {
        return { success: false, message: "Invalid license ID." };
    }
    
    try {
        const client = await clientPromise;
        const db = client.db();
        
        const license = await db.collection('licenses').findOne({ _id: new ObjectId(licenseId) });
        if (!license) {
            return { success: false, message: "License not found." };
        }
        
        if (license.status === 'revoked') {
            return { success: false, message: "Cannot reactivate a revoked (burned) license." };
        }

        await db.collection('licenses').updateOne(
            { _id: new ObjectId(licenseId) },
            { $set: { status: 'active' }, $unset: { reason: "", lastViolationDate: "" } }
        );
        
        return { success: true, message: "License has been reactivated." };

    } catch (error: any) {
        console.error("Error reactivating license:", error);
        return { success: false, message: `Failed to reactivate license: ${error.message}` };
    }
}


interface LicensingRules {
    ipLock: boolean;
    fingerprintLock: boolean;
}

interface SoftwareData {
    title: string;
    description: string;
    price: number;
    fileUrl: string;
    seller: string;
    version: string;
    category: string;
    licenseType: string;
    licenseTerms: string;
    logoUrl?: string;
    licensingRules: LicensingRules;
    decryptionKey: string;
}

/**
 * Uploads software metadata to the database. This is a server-only function.
 * @param softwareData The software data to upload.
 * @returns An object indicating success or failure.
 */
export async function uploadSoftware(softwareData: SoftwareData): Promise<{ success: boolean; message: string; softwareId?: ObjectId }> {
    try {
        const client = await clientPromise;
        const db = client.db();

        const { title, description, price, fileUrl, seller, version, category, licenseType, licenseTerms, logoUrl, licensingRules, decryptionKey } = softwareData;

        // Basic validation
        if (!title || price === undefined || !fileUrl || !seller || !licensingRules || !version || !licenseType || !licenseTerms || !decryptionKey) {
            return { success: false, message: "All software details and licensing rules are required." };
        }

        const user = await db.collection('users').findOne({ username: seller });
        if (!user) {
            return { success: false, message: "Seller does not exist." };
        }

        const newSoftware = {
            sellerId: user._id,
            sellerUsername: user.username,
            title,
            description,
            price: parseFloat(price.toString()) || 0,
            version,
            category,
            licenseType,
            licenseTerms,
            fileUrl,
            logoUrl,
            licensingRules,
            decryptionKey, // Storing the generated key
            createdAt: new Date(),
        };

        const result = await db.collection('software').insertOne(newSoftware);

        if (!result.insertedId) {
             return { success: false, message: "Failed to insert software record into database." };
        }

        return { success: true, message: "Software uploaded successfully.", softwareId: result.insertedId };
    } catch (error) {
        console.error("Error uploading software:", error);
        return { success: false, message: "An unexpected server error occurred." };
    }
}

/**
 * Deletes a software entry and all of its associated licenses.
 * @param softwareId The ID of the software to delete.
 * @returns An object indicating success or failure.
 */
export async function deleteSoftware(softwareId: string): Promise<{ success: boolean; message: string }> {
    if (!softwareId || !ObjectId.isValid(softwareId)) {
        return { success: false, message: "Invalid software ID." };
    }

    try {
        const client = await clientPromise;
        const db = client.db();

        const sId = new ObjectId(softwareId);

        // Optional: Check if software exists before attempting to delete
        const softwareExists = await db.collection('software').findOne({ _id: sId });
        if (!softwareExists) {
            return { success: false, message: "Software not found." };
        }

        // Delete all licenses associated with this software
        await db.collection('licenses').deleteMany({ softwareId: sId });

        // Delete the software itself
        const result = await db.collection('software').deleteOne({ _id: sId });

        if (result.deletedCount === 0) {
            return { success: false, message: "Failed to delete the software." };
        }

        return { success: true, message: "Software and all associated licenses have been deleted." };
    } catch (error) {
        console.error("Error deleting software:", error);
        return { success: false, message: "An unexpected server error occurred while deleting the software." };
    }
}
