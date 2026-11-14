/* ==========================================================================
   LEITOR ZERO-DEPENDENCY DE ARQUIVOS ZIP & MULTI-TUNE ABC
   Suporta Stored (0) e Deflate (8) via Web DecompressionStream ou Node zlib
   ========================================================================== */

const EOCD_SIG = 0x06054b50;
const CD_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

async function inflateRawBytes(compressedBytes) {
    if (typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(compressedBytes);
        writer.close();
        const decompressedStream = ds.readable;
        const reader = decompressedStream.getReader();
        const chunks = [];
        let totalLen = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
                chunks.push(value);
                totalLen += value.byteLength;
            }
        }
        const out = new Uint8Array(totalLen);
        let offset = 0;
        for (const chunk of chunks) {
            out.set(chunk, offset);
            offset += chunk.byteLength;
        }
        return out;
    }

    // Fallback para testes em Node.js
    const zlib = await import('node:zlib');
    return new Uint8Array(zlib.inflateRawSync(compressedBytes));
}

function findEOCDOffset(view) {
    const minOffset = Math.max(0, view.byteLength - 65557);
    for (let i = view.byteLength - 22; i >= minOffset; i--) {
        if (view.getUint32(i, true) === EOCD_SIG) {
            return i;
        }
    }
    return -1;
}

function decodeZipFilename(bytes, isUtf8) {
    try {
        return new TextDecoder(isUtf8 ? 'utf-8' : 'latin1').decode(bytes);
    } catch {
        return new TextDecoder().decode(bytes);
    }
}

/**
 * Extrai arquivos .abc e .txt de um ArrayBuffer ZIP sem dependências externas.
 * @param {ArrayBuffer|Uint8Array} input
 * @returns {Promise<Array<{ name: string, content: string }>>}
 */
export async function extractAbcFilesFromZip(input) {
    const u8 = input instanceof Uint8Array
        ? input
        : new Uint8Array(input);
    const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);

    const eocdOffset = findEOCDOffset(view);
    if (eocdOffset < 0) {
        throw new Error('Arquivo ZIP inválido (assinatura EOCD não encontrada).');
    }

    const totalEntries = view.getUint16(eocdOffset + 10, true);
    const cdOffset = view.getUint32(eocdOffset + 16, true);
    const results = [];
    const textDecoder = new TextDecoder('utf-8');

    let ptr = cdOffset;
    for (let idx = 0; idx < totalEntries; idx++) {
        if (ptr + 46 > view.byteLength || view.getUint32(ptr, true) !== CD_SIG) {
            break;
        }

        const flags = view.getUint16(ptr + 8, true);
        const method = view.getUint16(ptr + 10, true);
        const compressedSize = view.getUint32(ptr + 20, true);
        const nameLen = view.getUint16(ptr + 28, true);
        const extraLen = view.getUint16(ptr + 30, true);
        const commentLen = view.getUint16(ptr + 32, true);
        const localHeaderOffset = view.getUint32(ptr + 42, true);

        const nameBytes = u8.subarray(ptr + 46, ptr + 46 + nameLen);
        const isUtf8 = (flags & 0x0800) !== 0;
        const filename = decodeZipFilename(nameBytes, isUtf8);

        ptr += 46 + nameLen + extraLen + commentLen;

        // Ignora diretórios, metadados macOS e arquivos que não sejam .abc/.txt
        if (!filename || filename.endsWith('/')) continue;
        const baseName = filename.split('/').pop() || '';
        if (filename.startsWith('__MACOSX/') || baseName.startsWith('._')) continue;
        if (!/\.(abc|txt)$/i.test(baseName)) continue;

        if (localHeaderOffset + 30 > view.byteLength || view.getUint32(localHeaderOffset, true) !== LOCAL_SIG) {
            continue;
        }

        const localNameLen = view.getUint16(localHeaderOffset + 26, true);
        const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
        const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
        const dataEnd = dataStart + compressedSize;
        if (dataEnd > u8.byteLength) continue;

        const rawBytes = u8.subarray(dataStart, dataEnd);
        let outputBytes;
        if (method === 0) {
            outputBytes = rawBytes;
        } else if (method === 8) {
            outputBytes = await inflateRawBytes(rawBytes);
        } else {
            console.warn(`[zipReader] Método de compressão não suportado (${method}) para ${filename}`);
            continue;
        }

        results.push({
            name: filename,
            content: textDecoder.decode(outputBytes)
        });
    }

    return results;
}

/**
 * Divide um arquivo ABC que contém múltiplas músicas (separadas por linhas X:)
 * em blocos individuais prontos para parseABCNotation().
 * @param {string} rawText
 * @param {string} filename
 * @returns {Array<{ sourceFile: string, tuneIndex: number, abcText: string }>}
 */
export function splitABCTunes(rawText, filename = 'import.abc') {
    if (!rawText || !rawText.trim()) return [];

    const lines = rawText.replace(/^\uFEFF/, '').split(/\r?\n/);
    const blocks = [];
    let currentBlock = [];
    let seenX = false;

    for (const line of lines) {
        if (/^\s*X\s*:/.test(line)) {
            if (seenX && currentBlock.length > 0) {
                const text = currentBlock.join('\n').trim();
                if (text) blocks.push(text);
                currentBlock = [];
            }
            seenX = true;
        }
        currentBlock.push(line);
    }

    if (currentBlock.length > 0) {
        const text = currentBlock.join('\n').trim();
        if (text) blocks.push(text);
    }

    if (blocks.length === 0) {
        return [{ sourceFile: filename, tuneIndex: 1, abcText: rawText.trim() }];
    }

    return blocks.map((abcText, idx) => ({
        sourceFile: filename,
        tuneIndex: idx + 1,
        abcText
    }));
}
