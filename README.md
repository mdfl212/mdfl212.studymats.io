# Medical Board Exam Interactive Reviewer
An interactive, responsive HTML/JS questionnaire application designed to review medical subjects for licensure examinations (such as the PLE).

## 📌 Disclaimer & Project Notes
* **Educational & Fun Project:** This repository is an informal, non-profit personal study project created outside of medical school for learning, practice, and review purposes.
* **No Copyright Infringement Intended:** All question banks, concepts, and clinical rationales are used strictly under fair use for personal study and peer review. All original copyrights belong to their respective authors and board review sources.
* **Future Outlook:** Beyond board exam preparation, this project serves as an initial sandbox for experimenting with web technologies, data structuring, and potential Health Information System (HIS) development in the future.

## Features
- **Multiple Review Modes:** 
  - 📝 **Exam Mode:** Answer questions without immediate rationales.
  - 🔍 **Review Mode:** Instantly reveal rationales after selecting an answer.
  - 🗝 **Answer Key Mode:** View all correct answers and rationales immediately.
- **Granular Filtering:** Filter by section (Obstetrics, Gynecology), question type (Clinical vs. Conceptual), or topic tags (Preeclampsia, Contraception, STI, etc.).
- **Summary & Scoring:** Interactive score card modal with instant grade calculations.
- **Tabular View:** Searchable summary table containing stems, answers, and rationales for fast revision.
- **Responsive UI:** Custom design system built with CSS variables, accessible on desktop and mobile.
- **Centralized theming:** Every page loads `style.css` and declares its palette with `data-course` and `data-theme` (`light` or `dark`). The shared `theme.js` controller provides the theme toggle and remembers the user's preference.

## September 7,2026 update 
- Fixed subject catalog loading by repairing `subjects.json` and removing the invalid empty Prev Med placeholder record.
- Added Preventive Medicine to the YL4 subject list with its normalized question bank in `data/prevmed.json`.
- Fixed light/dark theme toggles so they work consistently on mobile devices.
- Extended mobile page backgrounds through the dynamic viewport and device safe area to prevent the lower color from being cut off.
- Moved the quiz subject/topic selectors and score summary below the question navigation; the four score cards now fit in one row on mobile screens.
- Run the project through a local web server because the index loads `subjects.json` and question banks with `fetch()`.

## Data-driven question bank

The root [index.html](index.html) is the single quiz interface for every subject. Subject metadata and color palettes live in [subjects.json](subjects.json), while normalized question records live in `data/*.json`. The shared [app.js](app.js) loads the selected subject, filters it, and renders one question at a time.

To add questions, append records to the appropriate JSON file using this shape:

```json
{
  "id": "IM-CARDIO-001",
  "subject": "Internal Medicine",
  "topic": "Cardiology",
  "question": "Question text",
  "questionImage": null,
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 1,
  "rationale": {
    "text": "Explanation of the answer.",
    "images": []
  }
}
```

`questionImage` and `rationale.images` accept relative paths or URLs and are optional. Adding a new subject only requires a metadata entry in `subjects.json` and its question data file; the HTML and quiz engine do not need to change.

### Legacy bank migration

The project also includes a conversion helper at `tools/convert_subject_html_to_json.py`. It scans the legacy subject HTML banks under `subjects/`, extracts the question arrays, and normalizes them into the shared JSON format used by the unified app. This makes it easy to keep expanding the question bank without rebuilding the UI shell.

## Project Structure

```text
.
├── index.html                       # Main landing page and year-level navigation
├── style.css                        # Centralized responsive styles and course themes
├── theme.js                         # Shared light/dark theme controller
├── app.js                           # Shared UI behavior (filters and scoring)
├── subjects.json                    # Subject metadata, data paths, and palettes
├── data/                             # Standardized question banks
│   ├── IM.json
│   ├── Pediatrics.json
│   ├── OBGyne.json
│   ├── Surgery.json
│   └── Pathology.json
├── README.md                        # Project overview and usage notes
├── _config.yml                      # Jekyll config for GitHub Pages
├── tools/
│   ├── Html2Word.html               # HTML-to-Word conversion utility
│   └── mht2html.html                # MHT to HTML conversion utility
├── subjects/
│   ├── yl1/
│   │   ├── anatomy/Anatomy.html
│   │   ├── biochemistry/harper.html
│   │   ├── family-community-health/FMC1.html
│   │   ├── histology/Histo.html
│   │   ├── physiology/Physio.html
│   │   └── research/Research.html
│   ├── yl2/
│   │   ├── microbiology/micro.html
│   │   ├── obgyn/obgyn.html
│   │   ├── obgyn/OBGYNE_DIGITAL_HistoryPE.html
│   │   ├── pathology/Pathotoya.html
│   │   ├── pediatrics/pedia.html
│   │   ├── pediatrics/pediasgdkael.html
│   │   └── pharmacology/pharma.html
│   ├── yl3/
│   │   └── internal-medicine/IM.html
│   └── yl4/
│       └── (reserved for future clerkship modules)
```
