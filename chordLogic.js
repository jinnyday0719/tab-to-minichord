const STRING_TO_MIDI = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 };
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NATURALS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SHARPS = ['C#', 'D#', 'F#', 'G#', 'A#'];
const CHORD_RULES = {
    '': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 10],
    'M7': [0, 4, 11], 'm7': [0, 3, 10], 'aug': [0, 4, 8], 'dim': [0, 3, 6]
};
const SLASH_TYPES = new Set(['', 'm', '7']);
const NOTE_GROUPS = [NATURALS, SHARPS].map(group =>
    group.map(name => ({ name, idx: NOTE_NAMES.indexOf(name) }))
);

function get_pads(root_idx, c_type, bass_idx = null) {
    const root_midi = 48 + root_idx;
    const intervals = CHORD_RULES[c_type];
    const p1 = (bass_idx !== null) ? (48 + bass_idx) : root_midi;
    const p2 = root_midi + intervals[1];
    const p3 = root_midi + intervals[2];
    const base_triad = [p1, p2, p3];
    const pads = [];
    for (let i = 0; i < 12; i++) {
        pads.push(base_triad[i % 3] + 12 * Math.floor(i / 3));
    }
    return pads;
}

function get_cost(current, target, t_type, t_root) {
    if (current === target) return 0;
    const is_sharp = SHARPS.includes(t_root);
    const is_complex = (['M7', 'm7', 'aug', 'dim'].includes(t_type)) || target.includes('/');
    if (!is_sharp && !is_complex) return 3;
    if (is_sharp && !is_complex) return 4;
    if (!is_sharp && is_complex) return 5;
    return 6;
}

function midi_to_name(m) {
    return NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1).toString();
}

function parse_input(raw_str) {
    const items = raw_str.trim().split(/\s+/);
    if (items.length === 0 || items[0] === '') return { midis: [], is_tab: false };
    const is_tab = items[0].includes(',');
    const midis = [];
    for (const item of items) {
        if (is_tab) {
            const [s, f] = item.split(',').map(Number);
            midis.push(STRING_TO_MIDI[s] + f);
        } else {
            const match = item.toUpperCase().match(/^([A-G]#?)(\d?)$/);
            if (!match) throw new Error(`"${item}"은(는) 유효하지 않은 형식입니다.`);
            const name = match[1];
            const octave = match[2] ? parseInt(match[2], 10) : 4;
            midis.push((octave + 1) * 12 + NOTE_NAMES.indexOf(name));
        }
    }
    return { midis, is_tab };
}

function process_notes(input_midis) {
    let idx = 0;
    let current_chord = null;
    const grouped_output = [];
    while (idx < input_midis.length) {
        let best_option = null;
        for (let length = input_midis.length - idx; length > 0; length--) {
            const target_notes = input_midis.slice(idx, idx + length);
            const candidates = [];
            for (const group of NOTE_GROUPS) {
                for (const { name: r_name, idx: r_idx } of group) {
                    for (const c_type in CHORD_RULES) {
                        const variants = [[null, `${r_name}${c_type}`]];
                        if (SLASH_TYPES.has(c_type)) {
                            for (const { name: b_name, idx: b_idx } of group) {
                                if (b_name !== r_name) variants.push([b_idx, `${r_name}${c_type}/${b_name}`]);
                            }
                        }
                        for (const variant of variants) {
                            const b_idx = variant[0], c_name = variant[1];
                            const p = get_pads(r_idx, c_type, b_idx);
                            const pad_indices = target_notes.map(m => p.indexOf(m));
                            if (pad_indices.every(i => i !== -1)) {
                                const cost = get_cost(current_chord, c_name, c_type, r_name);
                                candidates.push({ len: length, cost, pads: pad_indices.map(i => (i + 1).toString()), name: c_name });
                            }
                        }
                    }
                }
            }
        if (candidates.length > 0) {
            const minCost = Math.min(...candidates.map(c => c.cost));
            const bests = candidates.filter(c => c.cost === minCost);

            const uniqueOptions = [];
            bests.forEach(opt => {
                const padStr = opt.pads.join(' ');
                let existing = uniqueOptions.find(u => u.padStr === padStr);
                if (existing) {
                    if (!existing.names.includes(opt.name)) {
                        existing.names.push(opt.name);
                    }
                } else {
                    uniqueOptions.push({ names: [opt.name], padStr: padStr, len: opt.len });
                }
            });

            const entry = uniqueOptions.map(uo => `[${uo.names.join('/')}] ${uo.padStr}`).join(' / ');
            grouped_output.push(entry);
            current_chord = bests[0].name;
            idx += bests[0].len;
            best_option = true;
            break;
        }
    }
    if (!best_option) return null;
}
return grouped_output;
}

function run_chord_finder(user_input) {
    if (!user_input || !user_input.trim()) return "";
    try {
        const { midis, is_tab } = parse_input(user_input);
        if (midis.length === 0) return "";
        const output = [`[변환된 노트]\n${midis.map(midi_to_name).join(' ')}`];
        const out_range = midis.filter(m => m < 48 || m > 107).map(midi_to_name);
        if (out_range.length > 0) {
            output.push(`\n${out_range.join(', ')} 음이 포함되어 악보를 생성하지 않습니다.`);
            return output.join('\n');
        }
        const score = process_notes(midis);
        if (score) {
            output.push("\n[미니코드 악보]");
            output.push(...score);
        } else {
            output.push("\n해당 음들을 조합할 수 있는 코드를 찾지 못했습니다.");
        }
        return output.join('\n');
    } catch (e) {
        return `\n${e.message}`;
    }
}