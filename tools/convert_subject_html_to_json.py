import json
import re
from pathlib import Path

import js2py

ROOT = Path(__file__).resolve().parents[1]
SUBJECT_ROOT = ROOT / 'subjects'
DATA_ROOT = ROOT / 'data'

SUBJECT_NAME_MAP = {
    'anatomy': 'Anatomy',
    'biochemistry': 'Biochemistry',
    'family-community-health': 'Family & Community Health',
    'histology': 'Histology',
    'physiology': 'Physiology',
    'research': 'Research',
    'microbiology': 'Microbiology',
    'pharmacology': 'Pharmacology',
    'pediatrics': 'Pediatrics',
    'obgyn': 'Obstetrics and Gynecology',
    'pathology': 'Pathology',
    'internal-medicine': 'Internal Medicine',
    'surgery': 'Surgery',
}

DATA_FILE_MAP = {
    'Anatomy': 'Anatomy.json',
    'Biochemistry': 'Biochemistry.json',
    'Family & Community Health': 'FamilyCommunityHealth.json',
    'Histology': 'Histology.json',
    'Physiology': 'Physiology.json',
    'Research': 'Research.json',
    'Microbiology': 'Microbiology.json',
    'Pharmacology': 'Pharmacology.json',
    'Pediatrics': 'Pediatrics.json',
    'Obstetrics and Gynecology': 'OBGyne.json',
    'Pathology': 'Pathology.json',
    'Internal Medicine': 'IM.json',
    'Surgery': 'Surgery.json',
}

TOPIC_MAP = {
    'cell': 'Cell Physiology',
    'neuro': 'Neurophysiology',
    'cardio': 'Cardiology',
    'resp': 'Respiratory',
    'renal': 'Renal',
    'gi': 'Gastrointestinal',
    'endo': 'Endocrinology',
    'repro': 'Reproductive',
    'muscle': 'Muscle',
    'integrative': 'Integrative Physiology',
    'general': 'General',
    'clinical': 'Clinical',
    'concept': 'Conceptual',
    'calc': 'Calculation',
}


def normalize_topic(value):
    if value is None:
        return 'General'
    if isinstance(value, list):
        if value:
            return normalize_topic(value[0])
        return 'General'
    value = str(value).strip()
    if not value:
        return 'General'
    key = value.lower().replace(' ', '').replace('&', '').replace('-', '')
    return TOPIC_MAP.get(key, value)


def extract_array(text, variable_names=('Q', 'ALL_QS', 'ALL_Q', 'partA', 'partB')):
    found = []
    for name in variable_names:
        match = re.search(rf'(?:const|var)\s*{re.escape(name)}\s*=\s*(\[[\s\S]*?\])\s*;', text)
        if not match:
            continue
        payload = match.group(1)
        try:
            ctx = js2py.EvalJs()
            arr = ctx.eval(payload)
            try:
                found.append(list(arr))
            except Exception:
                found.append(arr)
        except Exception:
            pass
    if not found:
        return []
    if any(name in text for name in ('const Q =', 'var Q =', 'const ALL_Q =', 'var ALL_Q =', 'const ALL_QS =', 'var ALL_QS =')):
        direct = []
        for name in ('Q', 'ALL_Q', 'ALL_QS'):
            match = re.search(rf'(?:const|var)\s*{re.escape(name)}\s*=\s*(\[[\s\S]*?\])\s*;', text)
            if not match:
                continue
            payload = match.group(1)
            try:
                ctx = js2py.EvalJs()
                arr = ctx.eval(payload)
                direct.extend(list(arr))
            except Exception:
                pass
        if direct:
            return direct
    if len(found) == 1:
        return found[0]
    merged = []
    for entry in found:
        if isinstance(entry, (list, tuple)):
            merged.extend(list(entry))
    return merged


def clean_text(value):
    if value is None:
        return ''
    if isinstance(value, list):
        value = ' '.join(str(v) for v in value)
    text = str(value).strip()
    text = text.replace('\u2018', "'").replace('\u2019', "'")
    text = text.replace('\u201c', '"').replace('\u201d', '"')
    return text


def normalize_option(option):
    if isinstance(option, dict):
        for key in ('text', 'label', 'option', 'value'):
            if key in option:
                return clean_text(option[key])
        return clean_text(option)
    return clean_text(option)


def normalize_answer(raw_value):
    if raw_value is None:
        return 0
    if isinstance(raw_value, str):
        value = raw_value.strip().upper()
        if value and value[0].isalpha():
            alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
            idx = alphabet.find(value[0])
            if idx >= 0:
                return idx
        try:
            return int(value)
        except ValueError:
            return 0
    return int(raw_value)


def normalize_rationale(raw_rationale):
    if isinstance(raw_rationale, dict):
        text = raw_rationale.get('text') or raw_rationale.get('description') or raw_rationale.get('exp') or raw_rationale.get('r') or ''
        images = raw_rationale.get('images') or []
        return {'text': clean_text(text), 'images': images if isinstance(images, list) else []}
    if isinstance(raw_rationale, list):
        text = ' '.join(clean_text(item) for item in raw_rationale if clean_text(item))
        return {'text': text, 'images': []}
    return {'text': clean_text(raw_rationale), 'images': []}


def last_piece(value):
    if isinstance(value, str):
        return value
    return str(value)


def build_question(raw, subject_name, index):
    raw = raw or {}

    question_text = (
        raw.get('q') or raw.get('stem') or raw.get('question') or raw.get('prompt') or raw.get('text') or raw.get('query') or ''
    )
    options = raw.get('opts') or raw.get('options') or raw.get('choices') or []
    rationale = raw.get('r') or raw.get('exp') or raw.get('explanation') or raw.get('rationale') or ''

    norm_options = []
    for option in options:
        text = normalize_option(option)
        if text:
            norm_options.append(text)

    if not norm_options and hasattr(raw, 'get'):
        for key in ('A', 'B', 'C', 'D', 'E'):
            if key in raw:
                norm_options.append(clean_text(raw[key]))

    correct = normalize_answer(raw.get('ans', raw.get('correctAnswer', raw.get('answer', raw.get('correct', 0)))))
    if correct >= len(norm_options):
        correct = 0

    topic = (
        raw.get('topic') or raw.get('sys') or raw.get('section') or raw.get('tags') or raw.get('tag') or raw.get('category') or 'General'
    )
    if isinstance(topic, list) and topic:
        topic = topic[0]
    topic_name = normalize_topic(topic)

    identifier = raw.get('id')
    if identifier is None:
        subject_slug = ''.join(ch for ch in subject_name.lower() if ch.isalpha() or ch.isdigit())
        identifier = f'{subject_slug.upper()}-{index + 1:03d}'
    else:
        identifier = str(identifier)

    return {
        'id': identifier,
        'subject': subject_name,
        'topic': topic_name,
        'question': clean_text(question_text),
        'questionImage': None,
        'options': norm_options,
        'correctAnswer': correct,
        'rationale': normalize_rationale(rationale),
    }


def parse_subject(html_path):
    text = html_path.read_text(encoding='utf-8', errors='ignore')
    array = extract_array(text)
    if not array:
        return []

    subject_name = next((name for folder_name, name in SUBJECT_NAME_MAP.items() if folder_name in str(html_path)), 'Unknown')
    if subject_name == 'Unknown':
        subject_name = html_path.parent.name.replace('-', ' ').title()
        subject_name = subject_name.replace('Yl1 ', '').replace('Yl2 ', '').replace('Yl3 ', '')
        if subject_name.startswith('Obgyn'):
            subject_name = 'Obstetrics and Gynecology'

    normalized = []
    for index, item in enumerate(array):
        if not isinstance(item, dict):
            continue
        normalized.append(build_question(item, subject_name, index))
    return normalized


def main():
    all_subjects = []
    for html_file in sorted(SUBJECT_ROOT.rglob('*.html')):
        # Skip generated files or non-question HTMLs
        if not html_file.name.endswith('.html'):
            continue
        subject_name = None
        for folder_name, mapped_name in SUBJECT_NAME_MAP.items():
            if folder_name in str(html_file):
                subject_name = mapped_name
                break
        if subject_name is None:
            continue

        normalized = parse_subject(html_file)
        if normalized:
            all_subjects.append((subject_name, normalized))

    for subject_name, items in all_subjects:
        data_file = DATA_ROOT / DATA_FILE_MAP.get(subject_name, f'{subject_name}.json')
        data_file.write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Converted {len(all_subjects)} subject files with questions.')
    for subject_name, items in all_subjects:
        print(f'  - {subject_name}: {len(items)} questions')


if __name__ == '__main__':
    main()
