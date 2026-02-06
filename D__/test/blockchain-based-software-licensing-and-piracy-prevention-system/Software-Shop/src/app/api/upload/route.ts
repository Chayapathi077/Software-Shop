
import { NextResponse } from 'next/server';
import { uploadSoftware } from '@/lib/auth';
import axios from 'axios';
import CryptoJS from 'crypto-js';

// This function now correctly encrypts the raw file buffer before uploading
async function encryptAndUploadToPinata(file: File, decryptionKey: string): Promise<string> {
    const PINATA_API_KEY = process.env.PINATA_API_KEY;
    const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
        throw new Error("Server configuration error: Pinata API keys are not set.");
    }
    
    try {
        // 1. Read file content into a buffer, then convert to a WordArray
        const fileBuffer = await file.arrayBuffer();
        const wordArray = CryptoJS.lib.WordArray.create(fileBuffer);

        // 2. Encrypt the WordArray using the provided key
        const keyHex = CryptoJS.enc.Hex.parse(decryptionKey);
        const iv = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');
        const encrypted = CryptoJS.AES.encrypt(wordArray, keyHex, { 
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        
        // 3. Convert the encrypted result's ciphertext into a raw Buffer that Pinata can handle.
        const encryptedBuffer = Buffer.from(encrypted.ciphertext.toString(CryptoJS.enc.Hex), 'hex');

        // 4. Upload the ENCRYPTED file buffer to Pinata
        const formData = new FormData();
        const encryptedFileBlob = new Blob([encryptedBuffer]);
        formData.append('file', encryptedFileBlob, `${file.name}.enc`);
        
        const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
            headers: {
                'pinata_api_key': PINATA_API_KEY,
                'pinata_secret_api_key': PINATA_SECRET_API_KEY
            }
        });
        
        return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;

    } catch (error: any) {
        console.error("Pinata upload/encryption error:", error);
        
        let errorMessage = "An unknown error occurred during upload.";
        if (error.response) {
            errorMessage = `Pinata API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
        } else if (error.request) {
            errorMessage = "No response received from Pinata. Check your network connection.";
        } else {
            errorMessage = error.message;
        }

        throw new Error(`Failed to upload to Pinata. Reason: ${errorMessage}`);
    }
}


export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const price = formData.get('price') as string;
    const seller = formData.get('seller') as string;
    const ipLock = formData.get('ipLock') === 'true';
    const fingerprintLock = formData.get('fingerprintLock') === 'true';
    const version = formData.get('version') as string;
    const category = formData.get('category') as string;
    const licenseType = formData.get('licenseType') as string;
    const licenseTerms = formData.get('licenseTerms') as string;
    const decryptionKey = formData.get('decryptionKey') as string;

    if (!file || !title || !price || !seller || !version || !licenseType || !category || !licenseTerms || !decryptionKey) {
        return NextResponse.json({ success: false, message: "Missing required fields for upload." }, { status: 400 });
    }
    
    const fileUrl = await encryptAndUploadToPinata(file, decryptionKey);
    
    const softwareResult = await uploadSoftware({
      title,
      description,
      price: parseFloat(price) || 0,
      fileUrl,
      seller,
      version,
      category,
      licenseType,
      licenseTerms,
      licensingRules: { ipLock, fingerprintLock },
      decryptionKey,
    });

    if (softwareResult.success) {
      return NextResponse.json(softwareResult, { status: 200 });
    } else {
      return NextResponse.json(softwareResult, { status: 500 });
    }

  } catch (error: any) {
    console.error("Error in /api/upload:", error);
    const message = error.message || "An unexpected server error occurred during the file upload process.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
