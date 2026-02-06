
import { NextResponse } from 'next/server';
import axios from 'axios';

async function uploadJsonToPinata(jsonData: object): Promise<string> {
    const PINATA_API_KEY = process.env.PINATA_API_KEY;
    const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
        throw new Error("Server configuration error: Pinata API keys are not set in the .env file.");
    }

    try {
        const response = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", jsonData, {
            headers: {
                'pinata_api_key': PINATA_API_KEY,
                'pinata_secret_api_key': PINATA_SECRET_API_KEY
            }
        });
        
        return `https://ipfs.io/ipfs/${response.data.IpfsHash}`;

    } catch (error: any) {
        console.error("Pinata JSON upload error:", error);
        
        let errorMessage = "An unknown error occurred during metadata upload.";
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
    const metadata = await request.json();

    if (!metadata || typeof metadata !== 'object') {
        return NextResponse.json({ success: false, message: "Invalid metadata provided." }, { status: 400 });
    }

    const metadataUrl = await uploadJsonToPinata(metadata);
    
    return NextResponse.json({ success: true, metadataUrl }, { status: 200 });

  } catch (error: any) {
    console.error("Error in /api/metadata/upload:", error);
    const message = error.message || "An unexpected server error occurred during the metadata upload process.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

    