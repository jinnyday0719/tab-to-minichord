const inputBox = document.querySelector('.input-box');
const outputBox = document.querySelector('.output-box');
const modeIndicator = document.querySelector('.mode-indicator');
const actionButtons = document.querySelector('.action-buttons');
const copyBtn = document.querySelector('.copy-btn');
const playBtn = document.querySelector('.play-btn');

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const KOR_TO_ENG = { 'ㅊ': 'C', 'ㅇ': 'D', 'ㄷ': 'E', 'ㄹ': 'F', 'ㅎ': 'G', 'ㅁ': 'A', 'ㅠ': 'B' };
const KOREAN_RE = /[ㄱ-ㅎㅏ-ㅣ가-힣]/g;

function applyNewResult(result) {
    outputBox.classList.remove('hide-anim', 'show-anim');
    actionButtons.classList.remove('hide-anim', 'show-anim');
    void outputBox.offsetWidth;

    outputBox.value = result;

    if (result.trim().length > 0) {
        actionButtons.classList.remove('hidden');
        outputBox.classList.add('show-anim');
        actionButtons.classList.add('show-anim');
    } else {
        actionButtons.classList.add('hidden');
    }
}

inputBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();

        const rawVal = inputBox.value;
        const trimmedVal = rawVal.trimStart();

        if (trimmedVal.length > 0) {
            const isTab = /^\d/.test(trimmedVal[0]);
            const words = rawVal.trim().split(/\s+/);

            for (let i = 0; i < words.length; i++) {
                if (isTab) {
                    if (words[i].endsWith(',')) words[i] += '0';
                } else {
                    if (/^[A-G]#?$/.test(words[i])) words[i] += '4';
                }
            }
            inputBox.value = words.join(' ');
            inputBox.dispatchEvent(new Event('input'));
        }

        const result = run_chord_finder(inputBox.value) || "";

        outputBox.classList.remove('show-anim');
        actionButtons.classList.remove('show-anim');
        void outputBox.offsetWidth;

        outputBox.classList.add('hide-anim');
        actionButtons.classList.add('hide-anim');

        setTimeout(() => applyNewResult(result), 250);
        return;
    }

    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab'].includes(e.key)) return;
    if (e.metaKey || e.ctrlKey) return;

    const value = inputBox.value;
    const pos = inputBox.selectionStart;
    const beforeCursor = value.substring(0, pos);
    const afterCursor = value.substring(pos);
    const wordBefore = beforeCursor.split(' ').pop();
    const wordAfter = afterCursor.split(' ')[0];

    const trimmed = value.trimStart();
    let isTabMode = true;
    if (trimmed.length > 0) {
        isTabMode = /^\d$/.test(trimmed[0]);
    } else if (e.key.length === 1 && e.key !== ' ') {
        isTabMode = /^\d$/.test(e.key);
    }

    const keyChar = isMobile ? (KOR_TO_ENG[e.key] || e.key) : e.key;

    if (/^[a-gA-G#]$/.test(keyChar)) {
        if (isTabMode) { e.preventDefault(); return; }
        if ((wordBefore + wordAfter).length >= 3) { e.preventDefault(); return; }
        if (keyChar === '#' && (beforeCursor === '' || beforeCursor.endsWith(' '))) { e.preventDefault(); return; }
        if (/^[a-gA-G]$/.test(keyChar) && /[A-G]/i.test(wordBefore + wordAfter)) { e.preventDefault(); return; }

        if (/^[a-z]$/.test(keyChar) || keyChar !== e.key) {
            e.preventDefault();
            inputBox.value = beforeCursor + keyChar.toUpperCase() + afterCursor;
            inputBox.selectionStart = inputBox.selectionEnd = pos + 1;
            inputBox.dispatchEvent(new Event('input'));
        }
        return;
    }

    if (/^\d$/.test(e.key)) {
        const currentWord = wordBefore + wordAfter;

        if (!isTabMode) {
            if (beforeCursor === '' || beforeCursor.endsWith(' ')) { e.preventDefault(); return; }
            if (currentWord.length >= 3) { e.preventDefault(); return; }
        } else {
            if (beforeCursor === '' || beforeCursor.endsWith(' ')) {
                if (!/^[1-6]$/.test(e.key)) { e.preventDefault(); return; }
                e.preventDefault();
                inputBox.value = beforeCursor + e.key + ',' + afterCursor;
                inputBox.selectionStart = inputBox.selectionEnd = pos + 2;
                return;
            } else {
                const parts = currentWord.split(',');
                if (wordBefore.includes(',')) {
                    if (parts.length > 1 && parts[1].length >= 2) { e.preventDefault(); return; }
                } else {
                    if (parts[0].length >= 1) { e.preventDefault(); return; }
                    if (!/^[1-6]$/.test(e.key)) { e.preventDefault(); return; }
                }
            }
        }
        return;
    }

    if (e.key === ' ') {
        if (beforeCursor === '' || beforeCursor.endsWith(' ')) { e.preventDefault(); return; }

        if (!isTabMode) {
            if (/^[A-G]#?$/.test(wordBefore)) {
                e.preventDefault();
                inputBox.value = beforeCursor + '4 ' + afterCursor;
                inputBox.selectionStart = inputBox.selectionEnd = pos + 2;
                inputBox.dispatchEvent(new Event('input'));
            }
            return;
        }

        if (/^\d+,\d+$/.test(wordBefore)) return;
        e.preventDefault();
        return;
    }

    if (e.key.length === 1) e.preventDefault();
});

let indicatorLock = false;
inputBox.addEventListener('input', () => {
    let val = inputBox.value;

    if (isMobile) {
        val = val.replace(/ㅊ/g, 'C').replace(/ㅇ/g, 'D').replace(/ㄷ/g, 'E')
            .replace(/ㄹ/g, 'F').replace(/ㅎ/g, 'G').replace(/ㅁ/g, 'A').replace(/ㅠ/g, 'B');
    }

    val = val.replace(KOREAN_RE, '');

    if (val !== inputBox.value) {
        const pos = inputBox.selectionStart;
        inputBox.value = val;
        inputBox.selectionStart = inputBox.selectionEnd = pos;
    }

    const trimmed = inputBox.value.trimStart();
    const isTab = trimmed.length === 0 || /^\d$/.test(trimmed[0]);
    const currentMode = isTab ? 'tab mode' : 'note mode';

    if (val.length >= 1500 && !indicatorLock) {
        indicatorLock = true;
        const swapText = (newText, color, ms) => {
            modeIndicator.style.transition = `opacity ${ms / 1000}s ease-out`;
            modeIndicator.style.opacity = '0';
            setTimeout(() => {
                modeIndicator.textContent = newText;
                modeIndicator.style.color = color;
                modeIndicator.style.opacity = '1';
            }, ms);
        };

        swapText("최대 1500자 입력 초과", "#E74C3C", 125);
        setTimeout(() => {
            swapText(currentMode, "", 250);
            setTimeout(() => { indicatorLock = false; }, 500);
        }, 1160 + 125);
    } else if (val.length < 1500 && !indicatorLock) {
        modeIndicator.textContent = currentMode;
        modeIndicator.style.color = "";
    }
});

copyBtn.addEventListener('click', async () => {
    if (outputBox.value) {
        try {
            await navigator.clipboard.writeText(outputBox.value);
            const pathEl = copyBtn.querySelector('path');
            const svgEl = copyBtn.querySelector('svg');
            const checkPath = "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z";
            const originalPath = "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z";

            const swapIcon = (newPath, ms) => {
                svgEl.style.transition = `opacity ${ms / 1000}s ease-out`;
                svgEl.style.opacity = '0';
                setTimeout(() => {
                    pathEl.setAttribute('d', newPath);
                    svgEl.style.opacity = '1';
                }, ms);
            };

            swapIcon(checkPath, 125);
            setTimeout(() => swapIcon(originalPath, 250), 1160 + 125);
        } catch (e) { }
    }
});

let audioCtx;
let isPlaying = false;
playBtn.addEventListener('click', () => {
    if (isPlaying) return;
    try {
        const { midis } = parse_input(inputBox.value);
        if (!midis || midis.length === 0) return;

        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        isPlaying = true;
        const now = audioCtx.currentTime;
        const maxGain = 0.8;

        midis.forEach((midi, i) => {
            const freq = 440 * Math.pow(2, (midi - 69) / 12);
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const startT = now + i * 0.30;
            gainNode.gain.setValueAtTime(0, startT);
            gainNode.gain.linearRampToValueAtTime(maxGain, startT + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startT + 0.6);

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            osc.start(startT);
            osc.stop(startT + 0.8);
        });

        const totalMs = (midis.length * 0.30 + 0.5) * 1000;
        setTimeout(() => { isPlaying = false; }, totalMs);
    } catch (e) {
        isPlaying = false;
    }
});
