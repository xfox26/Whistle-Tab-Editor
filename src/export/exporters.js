/* ==========================================================================
   MOTORES DE EXPORTAÇÃO (SVG VETORIAL, PNG 300 DPI, STANDARD MIDI & WAV OFFLINE)
   ========================================================================== */

import {
    STANDARD_FINGERINGS,
    WHISTLE_KEYS_DATA,
    getNoteDisplayName,
    isNoteOctave2,
    getOrnamentSymbol,
    escapeHTML
} from '../config/whistleData.js';
import { getTransposedFrequency, scheduleWhistleVoice } from '../audio/synthEngine.js';

export function getDurationSVGSnippet(duration, cx, y) {
    const dur = parseFloat(duration) || 1.0;
    const ox = cx - 5.5;
    const oy = y;
    if (dur === 0.25) {
        return `<g transform="translate(${ox}, ${oy})">
            <ellipse cx="4.5" cy="13.5" rx="3.5" ry="2.5" transform="rotate(-25 4.5 13.5)" fill="#1c1815"/>
            <line x1="7.2" y1="13" x2="7.2" y2="2" stroke="#1c1815" stroke-width="1.6"/>
            <path d="M7.2 2 C10 4, 13 5, 11.5 8" fill="none" stroke="#1c1815" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M7.2 5 C10 7, 13 8, 11.5 11" fill="none" stroke="#1c1815" stroke-width="1.6" stroke-linecap="round"/>
        </g>`;
    }
    if (dur === 0.5) {
        return `<g transform="translate(${ox}, ${oy})">
            <ellipse cx="4.5" cy="13.5" rx="3.5" ry="2.5" transform="rotate(-25 4.5 13.5)" fill="#1c1815"/>
            <line x1="7.2" y1="13" x2="7.2" y2="2" stroke="#1c1815" stroke-width="1.6"/>
            <path d="M7.2 2 C10 4, 13 6, 11.5 10" fill="none" stroke="#1c1815" stroke-width="1.6" stroke-linecap="round"/>
        </g>`;
    }
    if (dur === 1.5) {
        return `<g transform="translate(${ox}, ${oy})">
            <ellipse cx="4.5" cy="13.5" rx="3.5" ry="2.5" transform="rotate(-25 4.5 13.5)" fill="#1c1815"/>
            <line x1="7.2" y1="13" x2="7.2" y2="2" stroke="#1c1815" stroke-width="1.6"/>
            <circle cx="11.5" cy="13.5" r="1.3" fill="#1c1815"/>
        </g>`;
    }
    if (dur === 2) {
        return `<g transform="translate(${ox}, ${oy})">
            <ellipse cx="4.5" cy="13.5" rx="3.5" ry="2.5" transform="rotate(-25 4.5 13.5)" fill="none" stroke="#1c1815" stroke-width="1.6"/>
            <line x1="7.2" y1="13" x2="7.2" y2="2" stroke="#1c1815" stroke-width="1.6"/>
        </g>`;
    }
    if (dur === 3) {
        return `<g transform="translate(${ox}, ${oy})">
            <ellipse cx="4.5" cy="13.5" rx="3.5" ry="2.5" transform="rotate(-25 4.5 13.5)" fill="none" stroke="#1c1815" stroke-width="1.6"/>
            <line x1="7.2" y1="13" x2="7.2" y2="2" stroke="#1c1815" stroke-width="1.6"/>
            <circle cx="11.5" cy="13.5" r="1.3" fill="#1c1815"/>
        </g>`;
    }
    if (dur === 4) {
        return `<g transform="translate(${ox}, ${oy})">
            <ellipse cx="7" cy="9" rx="5.5" ry="3.5" transform="rotate(-15 7 9)" fill="none" stroke="#1c1815" stroke-width="1.8"/>
        </g>`;
    }
    return `<g transform="translate(${ox}, ${oy})">
        <ellipse cx="4.5" cy="13.5" rx="3.5" ry="2.5" transform="rotate(-25 4.5 13.5)" fill="#1c1815"/>
        <line x1="7.2" y1="13" x2="7.2" y2="2" stroke="#1c1815" stroke-width="1.6"/>
    </g>`;
}

export function generateSongSVG(song, displayPrefs = null) {
    if (!song) return '';

    const title = song.title || 'Melodia Celta';
    const artist = song.artist || 'Tradicional';
    const key = song.key || 'D';
    const tempo = song.tempo || 120;
    const timeSig = song.timeSignature || '4/4';
    const rhythm = song.rhythm ? song.rhythm.toUpperCase() : 'CELTA';

    const svgWidth = 860;
    const minMarginX = 42;
    const maxLineWidth = 776;

    function getItemMetrics(item) {
        if (!item || item.note === 'LINEBREAK') {
            return { width: 0, before: 0, after: 0, total: 0 };
        }
        if (['BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(item.note)) {
            return { width: 16, before: 10, after: 10, total: 36 };
        }
        if (item.note === 'REST') {
            return { width: 36, before: 16, after: 16, total: 68 };
        }
        return { width: 32, before: 3, after: 3, total: 38 };
    }

    const lines = [];
    let currentLine = [];
    let currentLineWidth = 0;

    (song.notes || []).forEach(item => {
        if (item.note === 'LINEBREAK') {
            if (currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = [];
                currentLineWidth = 0;
            }
            return;
        }

        const metrics = getItemMetrics(item);
        const isBar = ['BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(item.note);

        if (isBar && currentLineWidth >= 520) {
            currentLine.push(item);
            lines.push(currentLine);
            currentLine = [];
            currentLineWidth = 0;
            return;
        }

        if (currentLineWidth + metrics.total > maxLineWidth && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = [];
            currentLineWidth = 0;
        }

        currentLine.push(item);
        currentLineWidth += metrics.total;
    });

    if (currentLine.length > 0) lines.push(currentLine);
    if (lines.length === 0) lines.push([]);

    const rowHeight = 166;
    const headerHeight = 110;
    const footerHeight = 45;
    const totalHeight = headerHeight + (lines.length * rowHeight) + footerHeight;

    let svgBody = '';

    const svgStyles = `
        <style>
            .title { font-family: 'Cinzel', serif, Georgia, 'Times New Roman'; font-size: 24px; font-weight: bold; fill: #111827; text-anchor: middle; letter-spacing: 0.5px; }
            .meta { font-family: 'Outfit', sans-serif, Arial; font-size: 12px; fill: #4b5563; text-anchor: middle; }
            .chord { font-family: 'Outfit', sans-serif, Arial; font-size: 12.5px; font-weight: bold; fill: #166534; text-anchor: middle; }
            .ornament { font-family: 'Cinzel', serif; font-size: 13.5px; font-weight: bold; fill: #b45309; text-anchor: middle; }
            .pitch { font-family: 'Cinzel', serif, Georgia; font-size: 13.5px; font-weight: bold; fill: #1f2937; text-anchor: middle; }
            .pitch-octave { font-family: 'Cinzel', serif, Georgia; font-size: 13.5px; font-weight: bold; fill: #047857; text-anchor: middle; }
            .pitch-rest { font-family: 'Outfit', sans-serif, Arial; font-size: 11px; font-weight: 600; fill: #6b7280; text-anchor: middle; }
            .lyric { font-family: 'Outfit', sans-serif, Arial; font-size: 10.5px; fill: #374151; text-anchor: middle; font-style: italic; }
            .whistle-line { stroke: #2a2421; stroke-width: 2.2; stroke-linecap: round; }
            .hole-closed { fill: #1c1815; stroke: #1c1815; stroke-width: 1.5; }
            .hole-open { fill: #ffffff; stroke: #1c1815; stroke-width: 1.5; }
            .bar-line { stroke: #3f3630; stroke-width: 2; stroke-linecap: round; }
            .bar-thick { stroke: #3f3630; stroke-width: 3.8; stroke-linecap: round; }
            .bar-dot { fill: #3f3630; }
            .footer-text { font-family: 'Outfit', sans-serif, Arial; font-size: 10.5px; fill: #9ca3af; text-anchor: middle; }
        </style>
    `;

    svgBody += `
        <rect width="100%" height="100%" fill="#fcfbf8" />
        <rect x="16" y="16" width="${svgWidth - 32}" height="${totalHeight - 32}" rx="12" fill="none" stroke="#e0d5be" stroke-width="1.5" />
        <text x="${svgWidth / 2}" y="50" class="title">${escapeHTML(title)}</text>
        <text x="${svgWidth / 2}" y="74" class="meta">${escapeHTML(artist)} • Flauta em ${key} • Compasso: ${timeSig} • ${tempo} BPM • ${rhythm}</text>
        <line x1="${minMarginX}" y1="92" x2="${svgWidth - minMarginX}" y2="92" stroke="#111827" stroke-width="1.5" />
    `;

    let startY = headerHeight;

    lines.forEach((line, lineIdx) => {
        let lineTotalWidth = 0;
        line.forEach(item => {
            lineTotalWidth += getItemMetrics(item).total;
        });

        let currentX = Math.max(minMarginX, (svgWidth - lineTotalWidth) / 2);

        line.forEach((item) => {
            const metrics = getItemMetrics(item);
            const isRest = item.note === 'REST';
            const isBar = ['BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(item.note);

            currentX += metrics.before;
            const cx = currentX + (metrics.width / 2);

            if (isBar) {
                const barTopY = startY + 28;
                const barBottomY = startY + 128;

                if (item.note === 'DOUBLE_BAR') {
                    svgBody += `
                        <line x1="${cx - 4}" y1="${barTopY}" x2="${cx - 4}" y2="${barBottomY}" class="bar-line" />
                        <line x1="${cx + 4}" y1="${barTopY}" x2="${cx + 4}" y2="${barBottomY}" class="bar-thick" />
                    `;
                } else if (item.note === 'REPEAT_START') {
                    svgBody += `
                        <line x1="${cx - 6}" y1="${barTopY}" x2="${cx - 6}" y2="${barBottomY}" class="bar-thick" />
                        <line x1="${cx - 1}" y1="${barTopY}" x2="${cx - 1}" y2="${barBottomY}" class="bar-line" />
                        <circle cx="${cx + 5}" cy="${startY + 66}" r="2.4" class="bar-dot" />
                        <circle cx="${cx + 5}" cy="${startY + 94}" r="2.4" class="bar-dot" />
                    `;
                } else if (item.note === 'REPEAT_END') {
                    svgBody += `
                        <circle cx="${cx - 5}" cy="${startY + 66}" r="2.4" class="bar-dot" />
                        <circle cx="${cx - 5}" cy="${startY + 94}" r="2.4" class="bar-dot" />
                        <line x1="${cx + 1}" y1="${barTopY}" x2="${cx + 1}" y2="${barBottomY}" class="bar-line" />
                        <line x1="${cx + 6}" y1="${barTopY}" x2="${cx + 6}" y2="${barBottomY}" class="bar-thick" />
                    `;
                } else {
                    svgBody += `
                        <line x1="${cx}" y1="${barTopY}" x2="${cx}" y2="${barBottomY}" class="bar-line" />
                    `;
                }
            } else {
                const isFingeringOnly = !!(displayPrefs && displayPrefs.fingeringOnly);
                const showChords = !isFingeringOnly && (!displayPrefs || displayPrefs.chords !== false);
                const showOrnaments = !isFingeringOnly && (!displayPrefs || displayPrefs.ornaments !== false);
                const showPitch = !isFingeringOnly && (!displayPrefs || displayPrefs.pitch !== false);
                const showDurations = !isFingeringOnly && (!displayPrefs || displayPrefs.durations !== false);
                const showLyrics = !isFingeringOnly && (!displayPrefs || displayPrefs.lyrics !== false);

                if (showChords && item.chord) {
                    svgBody += `<text x="${cx}" y="${startY + 22}" class="chord">${escapeHTML(item.chord)}</text>`;
                }

                if (showOrnaments && item.ornament) {
                    const ornSymbol = getOrnamentSymbol(item.ornament);
                    svgBody += `<text x="${cx}" y="${startY + 36}" class="ornament">${ornSymbol}</text>`;
                }

                if (showPitch) {
                    if (!isRest) {
                        const displayName = getNoteDisplayName(item.note, key);
                        const isOct2 = isNoteOctave2(item.note, key);
                        const pClass = isOct2 ? 'pitch-octave' : 'pitch';
                        svgBody += `<text x="${cx}" y="${startY + 50}" class="${pClass}">${displayName}</text>`;
                    } else {
                        svgBody += `<text x="${cx}" y="${startY + 50}" class="pitch-rest">Pausa</text>`;
                    }
                }

                if (isRest) {
                    svgBody += `
                        <path d="M${cx - 4},${startY + 66} L${cx + 4},${startY + 77} L${cx - 3},${startY + 88} L${cx + 3},${startY + 99} A4,4 0 0,1 ${cx - 2},${startY + 113}" stroke="#4b5563" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none" />
                    `;
                } else {
                    const fingering = item.fingering || STANDARD_FINGERINGS[item.note] || [0, 0, 0, 0, 0, 0];
                    const fluteTopY = startY + 58;
                    const fluteBottomY = startY + 118;
                    svgBody += `<line x1="${cx}" y1="${fluteTopY}" x2="${cx}" y2="${fluteBottomY}" class="whistle-line" />`;

                    const holeSpacing = 9.5;
                    fingering.forEach((state, hIdx) => {
                        const hy = fluteTopY + 5 + (hIdx * holeSpacing);
                        if (state === 0.5) {
                            svgBody += `<circle cx="${cx}" cy="${hy}" r="3.6" class="hole-open" />`;
                            svgBody += `<path d="M${cx},${hy - 3.6} A3.6,3.6 0 0,0 ${cx},${hy + 3.6} Z" fill="#1c1815" />`;
                        } else {
                            const holeClass = state === 1 ? 'hole-closed' : 'hole-open';
                            svgBody += `<circle cx="${cx}" cy="${hy}" r="3.6" class="${holeClass}" />`;
                        }
                    });
                }

                if (showDurations) {
                    svgBody += getDurationSVGSnippet(item.duration, cx, startY + 120);
                }

                if (showLyrics && item.lyric) {
                    svgBody += `<text x="${cx}" y="${startY + 146}" class="lyric">${escapeHTML(item.lyric)}</text>`;
                }
            }

            currentX += metrics.width + metrics.after;
        });

        if (lineIdx < lines.length - 1) {
            svgBody += `
                <line x1="${minMarginX}" y1="${startY + rowHeight - 6}" x2="${svgWidth - minMarginX}" y2="${startY + rowHeight - 6}" stroke="#e5e7eb" stroke-width="1" />
            `;
        }

        startY += rowHeight;
    });

    svgBody += `
        <text x="${svgWidth / 2}" y="${totalHeight - 20}" class="footer-text">Tin Whistle Live • https://tinwhistle.live/</text>
    `;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${totalHeight}" width="${svgWidth}" height="${totalHeight}">
    ${svgStyles}
    ${svgBody}
</svg>`;
}

export function expandNotesWithRepeats(notes) {
    if (!Array.isArray(notes) || notes.length === 0) return [];
    const expanded = [];
    const triggeredRepeats = new Set();
    let repeatStartIdx = 0;
    let idx = 0;
    let safetyCounter = 0;
    const maxSteps = notes.length * 4 + 100;

    while (idx < notes.length && safetyCounter < maxSteps) {
        safetyCounter++;
        const item = notes[idx];
        if (!item) {
            idx++;
            continue;
        }
        if (item.note === 'REPEAT_START') {
            repeatStartIdx = idx + 1;
            idx++;
            continue;
        }
        if (item.note === 'REPEAT_END') {
            if (!triggeredRepeats.has(idx)) {
                triggeredRepeats.add(idx);
                idx = repeatStartIdx;
                continue;
            }
            repeatStartIdx = idx + 1;
            idx++;
            continue;
        }
        if (!['LINEBREAK', 'BAR', 'DOUBLE_BAR'].includes(item.note)) {
            expanded.push(item);
        }
        idx++;
    }
    return expanded;
}

export function writeVLQ(value) {
    const bytes = [];
    let buffer = value & 0x7F;
    while ((value >>= 7) > 0) {
        buffer <<= 8;
        buffer |= ((value & 0x7F) | 0x80);
    }
    while (true) {
        bytes.push(buffer & 0xFF);
        if (buffer & 0x80) {
            buffer >>= 8;
        } else {
            break;
        }
    }
    return bytes;
}

export function generateMIDIData(song) {
    if (!song) return null;

    const PPQ = 480;
    const bpm = parseInt(song.tempo) || 120;
    const usPerBeat = Math.round(60000000 / bpm);

    const whistleMidiMap = {
        'D5': 74, 'E5': 76, 'F#5': 78, 'G5': 79, 'A5': 81, 'B5': 83, 'C#6': 85, 'C5': 84,
        'D6': 86, 'E6': 88, 'F#6': 90, 'G6': 91, 'A6': 93, 'B6': 95, 'C#7': 97, 'C6': 96
    };

    const keyOffset = WHISTLE_KEYS_DATA[song.key]?.semitones || 0;
    const trackEvents = [];

    trackEvents.push(0x00);
    trackEvents.push(0xFF, 0x51, 0x03);
    trackEvents.push((usPerBeat >> 16) & 0xFF, (usPerBeat >> 8) & 0xFF, usPerBeat & 0xFF);

    let num = 4, den = 4;
    if (song.timeSignature === '3/4') { num = 3; den = 4; }
    else if (song.timeSignature === '6/8') { num = 6; den = 8; }
    else if (song.timeSignature === '2/4') { num = 2; den = 4; }
    else if (song.timeSignature === '9/8') { num = 9; den = 8; }
    const denPower = Math.round(Math.log2(den));

    trackEvents.push(0x00);
    trackEvents.push(0xFF, 0x58, 0x04, num, denPower, 24, 8);

    trackEvents.push(0x00);
    trackEvents.push(0xC0, 73);

    let pendingDeltaTicks = 0;
    const expandedNotes = expandNotesWithRepeats(song.notes || []);

    expandedNotes.forEach(noteObj => {
        if (!noteObj) return;

        const durRatio = parseFloat(noteObj.duration) || 1.0;
        const noteTicks = Math.max(1, Math.round(durRatio * PPQ));

        if (noteObj.note === 'REST') {
            pendingDeltaTicks += noteTicks;
            return;
        }

        const baseMidi = whistleMidiMap[noteObj.note];
        if (baseMidi === undefined) {
            pendingDeltaTicks += noteTicks;
            return;
        }

        const midiPitch = Math.max(0, Math.min(127, baseMidi + keyOffset));

        const vlqDeltaOn = writeVLQ(pendingDeltaTicks);
        trackEvents.push(...vlqDeltaOn);
        trackEvents.push(0x90, midiPitch, 95);
        pendingDeltaTicks = 0;

        const vlqDuration = writeVLQ(noteTicks);
        trackEvents.push(...vlqDuration);
        trackEvents.push(0x80, midiPitch, 0x00);
    });

    const endDelta = writeVLQ(pendingDeltaTicks);
    trackEvents.push(...endDelta);
    trackEvents.push(0xFF, 0x2F, 0x00);

    const headerChunk = [
        0x4D, 0x54, 0x68, 0x64,
        0x00, 0x00, 0x00, 0x06,
        0x00, 0x00,
        0x00, 0x01,
        (PPQ >> 8) & 0xFF, PPQ & 0xFF
    ];

    const trackLength = trackEvents.length;
    const trackHeader = [
        0x4D, 0x54, 0x72, 0x6B,
        (trackLength >> 24) & 0xFF,
        (trackLength >> 16) & 0xFF,
        (trackLength >> 8) & 0xFF,
        trackLength & 0xFF
    ];

    const fullMidi = new Uint8Array(headerChunk.length + trackHeader.length + trackEvents.length);
    fullMidi.set(headerChunk, 0);
    fullMidi.set(trackHeader, headerChunk.length);
    fullMidi.set(trackEvents, headerChunk.length + trackHeader.length);

    return fullMidi;
}

export async function renderSongToWAV(song) {
    const sampleRate = 44100;
    const bpm = parseInt(song.tempo) || 120;
    const secondsPerBeat = 60 / bpm;

    const expandedNotes = expandNotesWithRepeats(song.notes || []);

    let totalDurationSeconds = 1.0;
    expandedNotes.forEach(n => {
        totalDurationSeconds += (parseFloat(n.duration) || 1.0) * secondsPerBeat;
    });

    totalDurationSeconds = Math.max(2.0, totalDurationSeconds + 1.2);

    const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
        2,
        Math.ceil(sampleRate * totalDurationSeconds),
        sampleRate
    );

    let currentTime = 0.4;
    const whistleKey = song.key || 'D';

    expandedNotes.forEach(noteObj => {
        if (!noteObj) return;

        const dur = (parseFloat(noteObj.duration) || 1.0) * secondsPerBeat;

        if (noteObj.note !== 'REST') {
            const freq = getTransposedFrequency(noteObj.note, whistleKey);
            if (freq > 0) {
                scheduleWhistleToneOffline(offlineCtx, freq, dur * 0.94, currentTime, noteObj.ornament);
            }
        }
        currentTime += dur;
    });

    const renderedBuffer = await offlineCtx.startRendering();
    return audioBufferToWAVBlob(renderedBuffer);
}

export function scheduleWhistleToneOffline(ctx, frequency, duration, startTime, ornament) {
    scheduleWhistleVoice(ctx, frequency, duration, startTime, ornament);
}

export function audioBufferToWAVBlob(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    let result;
    if (numChannels === 2) {
        result = interleaveChannels(buffer.getChannelData(0), buffer.getChannelData(1));
    } else {
        result = buffer.getChannelData(0);
    }

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = result.length * bytesPerSample;
    const bufferSize = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    writeStringToDataView(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStringToDataView(view, 8, 'WAVE');

    writeStringToDataView(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    writeStringToDataView(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < result.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, result[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

export function interleaveChannels(ch1, ch2) {
    const length = ch1.length + ch2.length;
    const result = new Float32Array(length);
    let inputIndex = 0;
    for (let index = 0; index < length;) {
        result[index++] = ch1[inputIndex];
        result[index++] = ch2[inputIndex];
        inputIndex++;
    }
    return result;
}

export function writeStringToDataView(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
