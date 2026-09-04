// stego-logic.js

// --- 1. LSB (Least Significant Bit) ---
function embedLSB(imgData, binaryMsg) {
    let data = imgData.data;
    let msgIndex = 0;
    for (let i = 0; i < data.length; i++) {
        if ((i + 1) % 4 === 0) continue; // Skip Alpha
        if (msgIndex < binaryMsg.length) {
            data[i] = (data[i] & 0xFE) | parseInt(binaryMsg[msgIndex]);
            msgIndex++;
        } else break;
    }
    return imgData;
}

function extractLSB(imgData) {
    let data = imgData.data;
    let binaryMsg = '';
    for (let i = 0; i < data.length; i++) {
        if ((i + 1) % 4 === 0) continue;
        binaryMsg += (data[i] & 1).toString();
    }
    return binaryMsg;
}

// --- 2. MSB (Most Significant Bit) ---
function embedMSB(imgData, binaryMsg, targetBit) {
    let data = imgData.data;
    let msgIndex = 0;
    let mask = ~(1 << targetBit);

    for (let i = 0; i < data.length; i++) {
        if ((i + 1) % 4 === 0) continue; 
        if (msgIndex < binaryMsg.length) {
            let bitToEmbed = parseInt(binaryMsg[msgIndex]);
            data[i] = (data[i] & mask) | (bitToEmbed << targetBit);
            msgIndex++;
        } else break;
    }
    return imgData;
}

function extractMSB(imgData, targetBit) {
    let data = imgData.data;
    let binaryMsg = '';
    for (let i = 0; i < data.length; i++) {
        if ((i + 1) % 4 === 0) continue;
        let extractedBit = (data[i] >> targetBit) & 1;
        binaryMsg += extractedBit.toString();
    }
    return binaryMsg;
}

// --- 3. PVD (Pixel-Value Differencing - Simplified 1D) ---
function embedPVD(imgData, binaryMsg) {
    let data = imgData.data;
    let msgIndex = 0;
    for (let i = 0; i < data.length - 4; i += 8) {
        if (msgIndex >= binaryMsg.length) break;
        let p1 = data[i];
        let p2 = data[i + 4];
        let diff = Math.abs(p1 - p2);
        
        let bitsToEmbed = diff > 15 ? 2 : 1; 
        
        let chunk = binaryMsg.substr(msgIndex, bitsToEmbed);
        msgIndex += chunk.length;
        chunk = chunk.padEnd(bitsToEmbed, '0'); 
        let val = parseInt(chunk, 2);

        let mask = ~(Math.pow(2, bitsToEmbed) - 1);
        data[i] = (data[i] & mask) | val;
    }
    return imgData;
}

function extractPVD(imgData) {
    let data = imgData.data;
    let binaryMsg = '';
    for (let i = 0; i < data.length - 4; i += 8) {
        let p1 = data[i];
        let p2 = data[i + 4];
        let diff = Math.abs(p1 - p2);
        let bitsToExtract = diff > 15 ? 2 : 1;
        
        let mask = (Math.pow(2, bitsToExtract) - 1);
        let extractedVal = p1 & mask;
        binaryMsg += extractedVal.toString(2).padStart(bitsToExtract, '0');
    }
    return binaryMsg;
}

// --- 4. BPCS (Block Variance Approximation) ---
function embedBPCS(imgData, binaryMsg, thresholdAlpha) {
    let data = imgData.data;
    let msgIndex = 0;
    let width = imgData.width;
    let threshold = thresholdAlpha * 255; 
    let blockSize = 8;
    
    for (let y = 0; y < imgData.height - blockSize; y += blockSize) {
        for (let x = 0; x < width - blockSize; x += blockSize) {
            if (msgIndex >= binaryMsg.length) break;

            let minVal = 255, maxVal = 0;
            for (let by = 0; by < blockSize; by++) {
                for (let bx = 0; bx < blockSize; bx++) {
                    let idx = ((y + by) * width + (x + bx)) * 4;
                    let gray = (data[idx] + data[idx+1] + data[idx+2]) / 3;
                    if (gray < minVal) minVal = gray;
                    if (gray > maxVal) maxVal = gray;
                }
            }
            
            let complexity = maxVal - minVal;

            if (complexity > threshold) {
                for (let by = 0; by < blockSize; by++) {
                    for (let bx = 0; bx < blockSize; bx++) {
                        if (msgIndex >= binaryMsg.length) break;
                        let idx = ((y + by) * width + (x + bx)) * 4;
                        let chunk = binaryMsg.substr(msgIndex, 2).padEnd(2, '0');
                        let val = parseInt(chunk, 2);
                        data[idx] = (data[idx] & 0xFC) | val; 
                        msgIndex += 2;
                    }
                }
            }
        }
    }
    return imgData;
}

function extractBPCS(imgData, thresholdAlpha) {
    let data = imgData.data;
    let binaryMsg = '';
    let width = imgData.width;
    let threshold = thresholdAlpha * 255; 
    let blockSize = 8;

    for (let y = 0; y < imgData.height - blockSize; y += blockSize) {
        for (let x = 0; x < width - blockSize; x += blockSize) {
            let minVal = 255, maxVal = 0;
            for (let by = 0; by < blockSize; by++) {
                for (let bx = 0; bx < blockSize; bx++) {
                    let idx = ((y + by) * width + (x + bx)) * 4;
                    let gray = ((data[idx]&0xFC) + data[idx+1] + data[idx+2]) / 3;
                    if (gray < minVal) minVal = gray;
                    if (gray > maxVal) maxVal = gray;
                }
            }
            let complexity = maxVal - minVal;

            if (complexity > threshold) {
                for (let by = 0; by < blockSize; by++) {
                    for (let bx = 0; bx < blockSize; bx++) {
                        let idx = ((y + by) * width + (x + bx)) * 4;
                        let extracted = (data[idx] & 3).toString(2).padStart(2, '0');
                        binaryMsg += extracted;
                    }
                }
            }
        }
    }
    return binaryMsg;
}