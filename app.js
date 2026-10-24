const state = {
    subjects: [],
    questions: [],
    filteredQuestions: [],
    subject: null,
    mode: 'exam',
    currentIndex: 0,
    answers: {},
    revealed: {},
    filters: { topic: 'all' },
    tableView: false,
    activeYear: 'YL1'
};

const $ = (id) => document.getElementById(id);

const PROGRESS_STORAGE_PREFIX = 'studymats-progress-v1:';

const quizTimer = {
    remainingMs: 60 * 60 * 1000,
    deadline: null,
    intervalId: null,
    running: false,
    expired: false,
    hasStarted: false
};

function formatQuizTime(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours > 0
        ? [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
        : [minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function getQuizTimerRemaining() {
    return quizTimer.running
        ? Math.max(0, quizTimer.deadline - Date.now())
        : Math.max(0, quizTimer.remainingMs);
}

function renderQuizTimer() {
    const panel = $('quizTimerPanel');
    const display = $('quizTimerDisplay');
    const status = $('quizTimerStatus');
    const expiredNotice = $('quizTimerExpired');
    const startButton = $('timerStartButton');
    const pauseButton = $('timerPauseButton');
    if (!panel || !display || !status) return;

    const remaining = getQuizTimerRemaining();
    if (quizTimer.running && remaining <= 0) {
        quizTimer.remainingMs = 0;
        quizTimer.deadline = null;
        quizTimer.running = false;
        quizTimer.expired = true;
        if (quizTimer.intervalId !== null) window.clearInterval(quizTimer.intervalId);
        quizTimer.intervalId = null;
    } else if (!quizTimer.running) {
        quizTimer.remainingMs = remaining;
    }

    const finalRemaining = getQuizTimerRemaining();
    const warning = finalRemaining > 0 && finalRemaining <= 5 * 60 * 1000;
    panel.dataset.state = quizTimer.expired ? 'expired' : warning ? 'warning' : 'normal';
    display.textContent = formatQuizTime(finalRemaining);
    display.setAttribute('aria-label', quizTimer.expired
        ? 'Time is up'
        : `Time remaining: ${formatQuizTime(finalRemaining)}`);
    if (expiredNotice) expiredNotice.hidden = !quizTimer.expired;

    if (quizTimer.expired) {
        status.textContent = 'Time is up. Add time or reset the timer to continue.';
        if (startButton) startButton.textContent = '▶ Start';
        if (pauseButton) pauseButton.disabled = true;
        document.title = 'TIME IS UP! · StudyMats';
    } else {
        status.textContent = quizTimer.running
            ? (warning ? 'Less than five minutes left. Keep an eye on the clock.' : 'Timer running. Your time continues as you navigate questions.')
            : (quizTimer.hasStarted
                ? 'Timer paused. Resume when you are ready.'
                : 'Set a duration, then start when you are ready.');
        if (startButton) startButton.textContent = quizTimer.running ? '▶ Running' : '▶ Start';
        if (startButton) startButton.disabled = quizTimer.running;
        if (pauseButton) pauseButton.disabled = !quizTimer.running;
        if (!quizTimer.expired) document.title = document.title.replace(/^\d{2}:\d{2}(?::\d{2})? · /, '');
    }
}

function stopQuizTimerInterval() {
    if (quizTimer.intervalId !== null) window.clearInterval(quizTimer.intervalId);
    quizTimer.intervalId = null;
}

function startQuizTimer() {
    if (quizTimer.running) return;
    if (!quizTimer.hasStarted) {
        const durationInput = $('quizTimerDuration');
        const minutes = Number(durationInput?.value);
        if (!Number.isFinite(minutes) || minutes < 1 || minutes > 600) {
            if (durationInput) {
                durationInput.setAttribute('aria-invalid', 'true');
                durationInput.focus();
            }
            const status = $('quizTimerStatus');
            if (status) status.textContent = 'Enter a duration from 1 to 600 minutes.';
            return;
        }
        durationInput.removeAttribute('aria-invalid');
        quizTimer.remainingMs = Math.round(minutes) * 60 * 1000;
    }
    if (quizTimer.remainingMs <= 0) {
        renderQuizTimer();
        return;
    }
    quizTimer.expired = false;
    quizTimer.hasStarted = true;
    quizTimer.running = true;
    quizTimer.deadline = Date.now() + quizTimer.remainingMs;
    stopQuizTimerInterval();
    quizTimer.intervalId = window.setInterval(renderQuizTimer, 250);
    renderQuizTimer();
}

function pauseQuizTimer() {
    if (!quizTimer.running) return;
    quizTimer.remainingMs = Math.max(0, quizTimer.deadline - Date.now());
    quizTimer.deadline = null;
    quizTimer.running = false;
    stopQuizTimerInterval();
    renderQuizTimer();
}

function resetQuizTimer() {
    pauseQuizTimer();
    const durationInput = $('quizTimerDuration');
    const minutes = Number(durationInput?.value);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 600) {
        if (durationInput) {
            durationInput.setAttribute('aria-invalid', 'true');
            durationInput.focus();
        }
        const status = $('quizTimerStatus');
        if (status) status.textContent = 'Enter a duration from 1 to 600 minutes before resetting.';
        return;
    }
    if (durationInput) durationInput.removeAttribute('aria-invalid');
    quizTimer.remainingMs = Math.round(minutes) * 60 * 1000;
    quizTimer.deadline = null;
    quizTimer.running = false;
    quizTimer.expired = false;
    quizTimer.hasStarted = false;
    stopQuizTimerInterval();
    renderQuizTimer();
}

function addQuizTime(minutes) {
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const currentRemaining = getQuizTimerRemaining();
    quizTimer.remainingMs = currentRemaining + minutes * 60 * 1000;
    if (quizTimer.running) quizTimer.deadline = Date.now() + quizTimer.remainingMs;
    if (quizTimer.expired) {
        quizTimer.expired = false;
        quizTimer.hasStarted = true;
        quizTimer.running = false;
        quizTimer.deadline = null;
        stopQuizTimerInterval();
    }
    const durationInput = $('quizTimerDuration');
    if (durationInput && !quizTimer.hasStarted) {
        durationInput.value = String(Math.min(600, Math.ceil(quizTimer.remainingMs / 60000)));
    }
    renderQuizTimer();
}

function initializeQuizTimer() {
    $('timerStartButton')?.addEventListener('click', startQuizTimer);
    $('timerPauseButton')?.addEventListener('click', pauseQuizTimer);
    $('timerResetButton')?.addEventListener('click', resetQuizTimer);
    document.querySelectorAll('[data-timer-add]').forEach((button) => {
        button.addEventListener('click', () => addQuizTime(Number(button.dataset.timerAdd)));
    });
    $('quizTimerDuration')?.addEventListener('change', (event) => {
        const input = event.currentTarget;
        const minutes = Number(input.value);
        if (!Number.isFinite(minutes) || minutes < 1 || minutes > 600) {
            input.setAttribute('aria-invalid', 'true');
            return;
        }
        input.removeAttribute('aria-invalid');
        if (!quizTimer.running && !quizTimer.hasStarted) {
            quizTimer.remainingMs = Math.round(minutes) * 60000;
            renderQuizTimer();
        }
    });
    document.addEventListener('visibilitychange', () => {
        if (quizTimer.running) renderQuizTimer();
    });
    renderQuizTimer();
}


function progressStorageKey(subjectId) {
    const params = new URLSearchParams(window.location.search);
    const bankIds = (params.get('banks') || '').split(',').filter(Boolean).sort();
    const suffix = bankIds.length ? '::banks:' + bankIds.map(encodeURIComponent).join(',') : '';
    return PROGRESS_STORAGE_PREFIX + encodeURIComponent(subjectId) + suffix;
}

function recordStudyActivity(question) {
    if (!state.subject?.id || !question?.id) return;
    try {
        const key = 'studymats-activity-v1';
        const now = new Date();
        const day = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
        const entry = encodeURIComponent(state.subject.id) + '::' + String(question.id);
        const activity = JSON.parse(localStorage.getItem(key) || '{}');
        if (!Array.isArray(activity[day])) activity[day] = [];
        if (!activity[day].includes(entry)) activity[day].push(entry);
        localStorage.setItem(key, JSON.stringify(activity));
    } catch (error) {
        // Quiz answering should continue even if daily tracking cannot be stored.
        console.warn('StudyMats could not record daily activity.', error);
    }
}

function setSaveIndicator(status, message) {
    const indicator = $('saveIndicator');
    const label = $('saveIndicatorText');
    if (!indicator || !label) return;
    indicator.dataset.status = status;
    label.textContent = message;
}

function saveProgress() {
    if (!state.subject?.id) return;
    try {
        localStorage.setItem(progressStorageKey(state.subject.id), JSON.stringify({
            answers: state.answers,
            revealed: state.revealed,
            currentIndex: state.currentIndex,
            mode: state.mode,
            topic: state.filters.topic,
            savedAt: Date.now()
        }));
        setSaveIndicator('saved', 'Saved on this device');
    } catch (error) {
        // Storage may be unavailable or full; the reviewer should still work.
        setSaveIndicator('error', 'Autosave unavailable');
        console.warn('StudyMats could not save progress on this device.', error);
    }
}

function restoreProgress(subjectId) {
    try {
        const saved = localStorage.getItem(progressStorageKey(subjectId));
        if (!saved) return false;
        const progress = JSON.parse(saved);
        state.answers = progress.answers && typeof progress.answers === 'object' ? progress.answers : {};
        state.revealed = progress.revealed && typeof progress.revealed === 'object' ? progress.revealed : {};
        state.currentIndex = Number.isInteger(progress.currentIndex) ? Math.max(0, progress.currentIndex) : 0;
        state.mode = ['exam', 'review', 'key'].includes(progress.mode) ? progress.mode : 'exam';
        state.filters.topic = typeof progress.topic === 'string' ? progress.topic : 'all';
        return true;
    } catch (error) {
        console.warn('StudyMats could not restore saved progress.', error);
        return false;
    }
}
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));

const pathologyPhotosEnabled = false;

function imageMarkup(image, className, alt) {
    if (!pathologyPhotosEnabled || !image) return '';
    const fallback = 'assets/pathology/acute-inflammation.jpg';
    return `<img class="${className}" src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" loading="lazy" onerror="this.onerror=null;this.src='${fallback}';">`;
}

const pathologyImages = {
    inflammation: 'assets/pathology/acute-inflammation.jpg',
    liver: 'assets/pathology/cirrhosis.jpg',
    rickets: 'assets/pathology/rickets.jpg',
    melanoma: 'assets/pathology/melanoma.jpg',
    appendicitis: 'assets/pathology/appendicitis.jpg',
    asbestosis: 'assets/pathology/asbestosis.jpg',
    osteosarcoma: 'assets/pathology/osteosarcoma.jpg',
    glomerulonephritis: 'assets/pathology/glomerulonephritis.jpeg',
    tuberculosis: 'assets/pathology/tuberculosis.jpg',
    breast: 'assets/pathology/breast-cancer.png',
    colon: 'assets/pathology/colon-cancer.png',
    thyroid: 'assets/pathology/thyroid-cancer.jpg',
    lymphoma: 'assets/pathology/hodgkin-lymphoma.jpg',
    sickle: 'assets/pathology/sickle-cell.jpg',
    sarcoidosis: 'assets/pathology/sarcoidosis.png',
    endocarditis: 'assets/pathology/endocarditis.jpg',
    pancreatitis: 'assets/pathology/pancreatitis.png',
    osteoporosis: 'assets/pathology/osteoporosis.png',
    psoriasis: 'assets/pathology/psoriasis.jpg',
    cyclophosphamide: 'assets/pathology/cyclophosphamide.svg',
    naloxone: 'assets/pathology/naloxone.svg',
    fallback: 'assets/pathology/acute-inflammation.jpg'
};

function pathologyImageForQuestion(question) {
    if (!pathologyPhotosEnabled) return null;
    const text = `${question.topic || ''} ${question.question || ''}`.toLowerCase();
    const match = Object.keys(pathologyImages).find((key) => key !== 'fallback' && text.includes(key));
    return pathologyImages[match || 'fallback'];
}

function getYearLevelForSubject(subjectId) {
    const subject = state.subjects.find((item) => item.id === subjectId);
    return subject?.yearLevel || 'YL1';
}

function getSubjectsByYearLevel(level) {
    return state.subjects.filter((subject) => subject.yearLevel === level);
}

function syncYearIndicators() {
    const activeYear = state.activeYear === 'resources'
        ? 'resources'
        : (state.activeYear || getYearLevelForSubject(state.subject?.id || state.subjects[0]?.id || 'Anatomy'));
    const triggerLabel = $('ylNavTriggerLabel');
    if (triggerLabel) triggerLabel.textContent = activeYear === 'resources'
        ? getYearLevelForSubject(state.subject?.id || state.subjects[0]?.id || 'Anatomy')
        : activeYear;

    document.querySelectorAll('.yl-nav-link').forEach((button) => {
        const isActive = button.dataset.yl === (activeYear === 'resources'
            ? getYearLevelForSubject(state.subject?.id || state.subjects[0]?.id || 'Anatomy')
            : activeYear);
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-current', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('.hub-pill').forEach((button) => {
        const isActive = button.dataset.year === activeYear;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('[data-sidebar-yl]').forEach((button) => {
        const isActive = button.dataset.sidebarYl === activeYear;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });

    const hubList = $('hubSubjectList');
    if (!hubList) return;
    if (activeYear === 'resources') {
        hubList.innerHTML = `
            <div class="hub-resource-list">
                <a href="subjects/" class="hub-resource-item" target="_blank" rel="noreferrer">Legacy subject folders</a>
                <a href="tools/Html2Word.html" class="hub-resource-item" target="_blank" rel="noreferrer">HTML to Word helper</a>
                <a href="tools/mht2html.html" class="hub-resource-item" target="_blank" rel="noreferrer">MHT conversion tool</a>
            </div>
        `;
        return;
    }

    const subjects = getSubjectsByYearLevel(activeYear);
    hubList.innerHTML = subjects.map((subject) => `
        <button type="button" class="hub-subject-card ${state.subject?.id === subject.id ? 'selected' : ''}" data-subject-id="${escapeHtml(subject.id)}">
            <span class="hub-subject-icon">${escapeHtml(subject.icon)}</span>
            <span class="hub-subject-name">${escapeHtml(subject.name)}</span>
            <span class="hub-subject-desc">${escapeHtml(subject.description)}</span>
        </button>
    `).join('');

    document.querySelectorAll('.hub-subject-card').forEach((button) => {
        button.addEventListener('click', () => {
            const subjectId = button.dataset.subjectId;
            const subjectSelect = $('subjectSelect');
            if (subjectSelect) {
                subjectSelect.value = subjectId;
                selectSubject(subjectId).catch(showError);
                return;
            }
            window.location.href = `quiz.html?subject=${encodeURIComponent(subjectId)}`;
        });
    });
}

function setActiveYear(yearLevel) {
    state.activeYear = yearLevel;
    syncYearIndicators();
    const subjectSelect = $('subjectSelect');
    if (!subjectSelect) {
        return;
    }
    if (yearLevel === 'resources') return;
    const yearSubjects = getSubjectsByYearLevel(yearLevel);
    if (yearSubjects.length > 0) {
        const target = yearSubjects[0];
        subjectSelect.value = target.id;
        selectSubject(target.id).catch(showError);
    }
}

async function loadSubjects() {
    const response = await fetch('subjects.json');
    if (!response.ok) throw new Error('Unable to load subject metadata.');
    state.subjects = await response.json();
    const subjectSelect = $('subjectSelect');
    if (subjectSelect) {
        subjectSelect.innerHTML = state.subjects.map((subject) =>
            `<option value="${escapeHtml(subject.id)}">${escapeHtml(subject.name)}</option>`).join('');
    }
    const params = new URLSearchParams(window.location.search);
    const requestedSubject = params.get('subject');
    const defaultSubject = state.subjects.find((item) => item.id === requestedSubject)
        || state.subjects.find((item) => item.yearLevel === state.activeYear)
        || state.subjects[0];
    syncYearIndicators();
    if (subjectSelect) {
        if (requestedSubject) {
            subjectSelect.value = defaultSubject.id;
        }
        await selectSubject(defaultSubject.id);
    }
}

async function selectSubject(subjectId) {
    const subject = state.subjects.find((item) => item.id === subjectId);
    if (!subject) return;
    const response = await fetch(subject.data);
    if (!response.ok) throw new Error(`Unable to load ${subject.name} questions.`);
    state.subject = subject;
    state.activeYear = subject.yearLevel || state.activeYear;
    const baseQuestions = await response.json();
    const params = new URLSearchParams(window.location.search);
    const bankIds = (params.get('banks') || '').split(',').filter(Boolean);
    if (bankIds.length) {
        let customBanks = [];
        try {
            const savedBanks = JSON.parse(localStorage.getItem('studymats-user-banks-v1') || '[]');
            customBanks = Array.isArray(savedBanks) ? savedBanks : [];
        } catch (error) {
            console.warn('StudyMats could not read imported banks.', error);
        }
        const chosen = bankIds.map(id => customBanks.find(bank => bank.id === id)).filter(Boolean);
        const included = chosen.flatMap(bank => (Array.isArray(bank.questions) ? bank.questions : [])
            .filter(question => {
                const subjectName = String(question.subject || '').toLowerCase();
                const subjectIds = Array.isArray(bank.subjectIds) ? bank.subjectIds : [];
                return subjectIds.includes(subject.id) || subjectName === subject.id.toLowerCase() || subjectName === subject.name.toLowerCase();
            })
            .map((question, index) => ({
                ...question,
                id: String(question.id || 'imported-' + index),
                _sourceBankId: bank.id,
                _sourceBankName: bank.name
            })));
        const sourceQuestions = chosen.length ? included : [];
        state.questions = sourceQuestions.length ? sourceQuestions : baseQuestions;
    } else {
        state.questions = baseQuestions;
    }
    state.answers = {};
    state.revealed = {};
    state.currentIndex = 0;
    state.mode = 'exam';
    state.filters.topic = 'all';
    document.documentElement.style.setProperty('--accent', subject.colors.accent);
    document.documentElement.style.setProperty('--accent-soft', subject.colors.accentSoft);
    $('headerEyebrow').textContent = `${subject.icon} ${subject.name} question bank`;
    $('headerTitle').innerHTML = `<em>${escapeHtml(subject.shortName || subject.name)}</em><br>Question Reviewer`;
    $('headerSubtitle').textContent = subject.description;
    syncYearIndicators();
    populateTopics();
    restoreProgress(subjectId);
    if ($('topicFilter')) {
        $('topicFilter').value = state.filters.topic;
    }
    applyFilters();
    // Deep links from the dashboard search open the exact matching bank item.
    const requestedQuestion = new URLSearchParams(window.location.search).get('question');
    if (requestedQuestion) {
        const questionIndex = state.filteredQuestions.findIndex((item) => String(item.id) === requestedQuestion);
        if (questionIndex >= 0) {
            state.currentIndex = questionIndex;
            render();
        } else {
            console.warn('Requested question ID was not found in the selected subject bank:', requestedQuestion);
        }
    }
}

function populateTopics() {
    const topics = [...new Set(state.questions.flatMap(getQuestionTags))].sort();
    $('topicFilter').innerHTML = '<option value="all">All topics</option>' +
        topics.map((topic) => `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`).join('');
    state.filters.topic = 'all';
    if ($('topicFilter')) {
        $('topicFilter').value = 'all';
    }
}

function getQuestionTags(question) {
    return [...new Set([
        question.topic,
        ...(Array.isArray(question.tags) ? question.tags : [])
    ].filter(Boolean))];
}

function tagMayRevealAnswer(tag, answer) {
    const normalize = (value) => String(value).normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    const tagText = normalize(tag);
    const answerText = normalize(answer);
    const tagWords = tagText.split(' ');
    const answerWords = answerText.split(' ');

    if (!tagText || !answerText) return false;
    return tagText === answerText ||
        answerText.includes(tagText) ||
        tagText.includes(answerText) ||
        tagWords.every((word) => answerWords.some((answerWord) =>
            word === answerWord || (word.length === 1 && answerWord.startsWith(word))));
}

function applyFilters() {
    state.filteredQuestions = state.questions.filter((question) =>
        state.filters.topic === 'all' || getQuestionTags(question).includes(state.filters.topic));
    state.currentIndex = Math.min(state.currentIndex, Math.max(state.filteredQuestions.length - 1, 0));
    render();
}

function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.mode === mode));
    render();
}

function selectAnswer(index) {
    const question = state.filteredQuestions[state.currentIndex];
    if (!question || state.mode === 'key') return;
    recordStudyActivity(question);
    state.answers[question.id] = index;
    if (state.mode === 'review') state.revealed[question.id] = true;
    render();
}

function renderTable() {
    const search = ($('tableSearch')?.value || '').trim().toLowerCase();
    let rows = state.filteredQuestions;
    if (search) {
        rows = rows.filter((question) => {
            const haystack = [
                question.topic,
                question.question,
                question.rationale?.text || '',
                question.subject || ''
            ].join(' ').toLowerCase();
            return haystack.includes(search);
        });
    }

    const mappedRows = rows.map((question, index) => {
        const answerValue = state.answers[question.id];
        const reveal = state.mode === 'key' || state.revealed[question.id];
        let answerText = '—';
        if (reveal) {
            answerText = String.fromCharCode(65 + question.correctAnswer);
        } else if (answerValue !== undefined) {
            answerText = String.fromCharCode(65 + answerValue);
        }
        const rationale = question.rationale?.text || '—';
        const questionIndex = state.filteredQuestions.indexOf(question);
        return `
            <tr class="table-row" data-question-index="${questionIndex}" tabindex="0">
                <td>${index + 1}</td>
                <td>${escapeHtml(question.topic || '—')}</td>
                <td>${escapeHtml(answerText)}</td>
                <td><span class="table-question-id">ID: ${escapeHtml(question.id)}</span>${escapeHtml(question.question)}</td>
                <td>${escapeHtml(rationale)}</td>
            </tr>
        `;
    });

    $('tableBody').innerHTML = mappedRows.join('');
    document.querySelectorAll('.table-row').forEach((row) => {
        row.addEventListener('click', () => {
            state.currentIndex = Number(row.dataset.questionIndex);
            state.tableView = false;
            render();
        });
        row.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                row.click();
            }
        });
    });
    $('tableCount').textContent = `${rows.length} of ${state.filteredQuestions.length} items`;
}

function toggleTableView() {
    state.tableView = !state.tableView;
    const tablePanel = $('tablePanel');
    const questionContainer = $('questionContainer');
    const tableToggleButton = $('tableToggleButton');
    const shouldShowTable = state.tableView;
    tablePanel.classList.toggle('hidden', !shouldShowTable);
    questionContainer.classList.toggle('hidden', shouldShowTable);
    tableToggleButton.classList.toggle('active', shouldShowTable);
    if (shouldShowTable) {
        renderTable();
    }
}

function render() {
    saveProgress();
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.mode === state.mode));
    document.querySelectorAll('[data-sidebar-mode]').forEach((button) => { button.classList.toggle('active', button.dataset.sidebarMode === state.mode); button.setAttribute('aria-pressed', String(button.dataset.sidebarMode === state.mode)); });
    const question = state.filteredQuestions[state.currentIndex];
    const total = state.filteredQuestions.length;
    const answered = state.filteredQuestions.filter((item) => state.answers[item.id] !== undefined).length;
    const correct = state.filteredQuestions.filter((item) => state.answers[item.id] === item.correctAnswer).length;
    const percent = answered ? Math.round(correct / answered * 100) : 0;
    $('sTotal').textContent = total;
    $('sAnswered').textContent = answered;
    $('sCorrect').textContent = correct;
    $('sPct').textContent = answered ? `${percent}%` : '-';
    $('progLabel').textContent = `${answered} / ${total} answered`;
    $('progPct').textContent = `${total ? Math.round(answered / total * 100) : 0}%`;
    $('progFill').style.width = `${total ? answered / total * 100 : 0}%`;
    $('pageInfo').textContent = question ? `Question ${state.currentIndex + 1} of ${total}` : 'Question 0 of 0';
    const questionSelect = $('questionSelect');
    if (questionSelect) {
        questionSelect.innerHTML = state.filteredQuestions.map((item, index) => {
            const preview = String(item.question || '').replace(/\\s+/g, ' ').trim();
            const label = preview.length > 68 ? preview.slice(0, 65) + '…' : preview;
            return `<option value="${index}">Q${index + 1} — ${escapeHtml(label || item.id || 'Question') }</option>`;
        }).join('');
        questionSelect.disabled = total === 0;
        questionSelect.value = String(state.currentIndex);
    }
    if ($('sidebarSubjectName')) $('sidebarSubjectName').textContent = state.subject?.name || 'Choose a subject';
    if ($('sidebarQuestionCount')) $('sidebarQuestionCount').textContent = `${total} questions · ${answered} answered`;
    $('previousButton').disabled = state.currentIndex === 0;
    $('nextButton').disabled = !total || state.currentIndex === total - 1;
    if (state.tableView) {
        $('questionContainer').classList.add('hidden');
        $('tablePanel').classList.remove('hidden');
        renderTable();
        return;
    }
    $('questionContainer').classList.remove('hidden');
    $('tablePanel').classList.add('hidden');
    if (!question) {
        $('questionContent').innerHTML = '<div class="empty-state">No questions match these filters.</div>';
        return;
    }
    const answer = state.answers[question.id];
    const revealed = state.mode === 'key' || state.revealed[question.id];
    const options = question.options.map((option, index) => {
        let className = 'opt';
        if (revealed && index === question.correctAnswer) className += ' correct';
        else if (revealed && answer === index) className += ' wrong';
        else if (!revealed && answer === index) className += ' selected';
        return `<button class="${className}" data-answer="${index}" type="button">
            <span class="opt-letter">${String.fromCharCode(65 + index)}.</span><span>${escapeHtml(option)}</span>
        </button>`;
    }).join('');
    const rationale = revealed ? `<div class="rationale"><strong>Answer: ${String.fromCharCode(65 + question.correctAnswer)}</strong> - ${escapeHtml(question.rationale?.text || '')}
        ${imageMarkup(pathologyImageForQuestion(question), 'rationale-image', 'Pathology illustration')}</div>` : '';
    const showQuestionImage = answer !== undefined || revealed;
    const correctAnswer = question.options[question.correctAnswer];
    const questionTags = getQuestionTags(question)
        .filter((tag) => !tagMayRevealAnswer(tag, correctAnswer))
        .map((tag, index) =>
            `<span class="${index === 0 ? 'badge badge-theme' : 'tag'}">${escapeHtml(tag)}</span>`).join('');
    $('questionContent').innerHTML = `
        <div class="q-meta"><span class="q-num">Q${state.currentIndex + 1}</span>
            <span class="q-json-id">ID: ${escapeHtml(question.id)}</span>
            ${question._sourceBankName ? '<span class="tag">' + escapeHtml(question._sourceBankName) + '</span>' : ''}
            ${questionTags}
        </div>
        <div class="q-stem">${escapeHtml(question.question)}</div>
        <div class="options">${options}</div>
        ${showQuestionImage ? imageMarkup(pathologyImageForQuestion(question), 'question-image', 'Pathology illustration') : ''}
        ${answer !== undefined && !revealed ? '<button class="reveal-btn" id="revealButton" type="button">Show answer &amp; rationale</button>' : ''}
        ${rationale}
    `;
    document.querySelectorAll('[data-answer]').forEach((button) =>
        button.addEventListener('click', () => selectAnswer(Number(button.dataset.answer))));
    const revealButton = $('revealButton');
    if (revealButton) revealButton.addEventListener('click', () => {
        state.revealed[question.id] = true;
        render();
    });
}

function showScore() {
    const questions = state.filteredQuestions;
    const answered = questions.filter((question) => state.answers[question.id] !== undefined).length;
    const correct = questions.filter((question) => state.answers[question.id] === question.correctAnswer).length;
    const percent = answered ? Math.round(correct / answered * 100) : 0;
    $('modalSub').textContent = `${state.subject.name} - ${questions.length} questions`;
    $('modalScore').textContent = `${percent}%`;
    $('modalGrade').textContent = percent >= 75 ? 'Pass' : 'Needs review';
    $('mdAns').textContent = answered;
    $('mdCorr').textContent = correct;
    $('mdWrong').textContent = answered - correct;
    $('scoreModal').hidden = false;
    $('scoreModal').classList.add('open');
}

function resetQuiz() {
    if (!window.confirm('Reset all answers for this subject?')) return;
    state.answers = {};
    state.revealed = {};
    state.currentIndex = 0;
    try {
        localStorage.removeItem(progressStorageKey(state.subject.id));
    } catch (error) {
        console.warn('StudyMats could not clear saved progress on this device.', error);
    }
    render();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeQuizTimer();
    const subjectSelect = $('subjectSelect');
    const topicFilter = $('topicFilter');
    const questionSelect = $('questionSelect');
    const previousButton = $('previousButton');
    const nextButton = $('nextButton');
    const scoreButton = $('scoreButton');
    const resetButton = $('resetButton');
    const tableToggleButton = $('tableToggleButton');
    const tableSearch = $('tableSearch');
    const closeScoreButton = $('closeScoreButton');
    const ylNavTrigger = $('ylNavTrigger');
    const ylNavFlyout = $('ylNavFlyout');
    const sidebar = $('quizSidebar');
    const sidebarBackdrop = $('sidebarBackdrop');
    const sidebarToggle = $('sidebarToggle');
    const sidebarClose = $('sidebarClose');
    const closeSidebar = () => {
        if (!sidebar || !sidebarBackdrop) return;
        sidebar.classList.remove('is-open');
        sidebar.setAttribute('aria-hidden', 'true');
        sidebarBackdrop.hidden = true;
        document.body.classList.remove('sidebar-open');
        sidebarToggle?.setAttribute('aria-expanded', 'false');
        sidebarToggle?.setAttribute('aria-label', 'Open navigation menu');
    };
    const openSidebar = () => {
        if (!sidebar || !sidebarBackdrop) return;
        sidebar.classList.add('is-open');
        sidebar.setAttribute('aria-hidden', 'false');
        sidebarBackdrop.hidden = false;
        document.body.classList.add('sidebar-open');
        sidebarToggle?.setAttribute('aria-expanded', 'true');
        sidebarToggle?.setAttribute('aria-label', 'Close navigation menu');
        sidebarClose?.focus();
    };
    sidebarToggle?.addEventListener('click', () => sidebar?.classList.contains('is-open') ? closeSidebar() : openSidebar());
    sidebarClose?.addEventListener('click', closeSidebar);
    sidebarBackdrop?.addEventListener('click', closeSidebar);
    document.querySelectorAll('[data-sidebar-yl]').forEach((button) => button.addEventListener('click', () => {
        setActiveYear(button.dataset.sidebarYl);
        closeSidebar();
    }));
    document.querySelectorAll('[data-sidebar-mode]').forEach((button) => button.addEventListener('click', () => {
        setMode(button.dataset.sidebarMode);
        closeSidebar();
    }));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeSidebar();
    });

    if (subjectSelect) {
        subjectSelect.addEventListener('change', (event) => selectSubject(event.target.value).catch(showError));
    }
    if (topicFilter) {
        topicFilter.addEventListener('change', (event) => { state.filters.topic = event.target.value; applyFilters(); });
    }
    if (questionSelect) {
        questionSelect.addEventListener('change', (event) => {
            const nextIndex = Number(event.target.value);
            if (Number.isInteger(nextIndex) && nextIndex >= 0 && nextIndex < state.filteredQuestions.length) {
                state.currentIndex = nextIndex;
                render();
            }
        });
    }
    document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
    if (previousButton) {
        previousButton.addEventListener('click', () => { if (state.currentIndex > 0) { state.currentIndex--; render(); } });
    }
    if (nextButton) {
        nextButton.addEventListener('click', () => { if (state.currentIndex < state.filteredQuestions.length - 1) { state.currentIndex++; render(); } });
    }
    if (scoreButton) {
        scoreButton.addEventListener('click', showScore);
    }
    if (resetButton) {
        resetButton.addEventListener('click', resetQuiz);
    }
    if (tableToggleButton) {
        tableToggleButton.addEventListener('click', toggleTableView);
    }
    if (tableSearch) {
        tableSearch.addEventListener('input', renderTable);
    }
    if (closeScoreButton) {
        closeScoreButton.addEventListener('click', () => { $('scoreModal').hidden = true; $('scoreModal').classList.remove('open'); });
    }
    if (ylNavTrigger && ylNavFlyout) {
        ylNavTrigger.addEventListener('click', (event) => {
            event.stopPropagation();
            const navContainer = ylNavTrigger.closest('.yl-nav');
            const isOpen = ylNavFlyout.classList.toggle('open');
            navContainer.classList.toggle('open', isOpen);
            ylNavTrigger.setAttribute('aria-expanded', String(isOpen));
        });
        document.querySelectorAll('.yl-nav-link').forEach((button) => {
            button.addEventListener('click', () => {
                setActiveYear(button.dataset.yl);
                ylNavFlyout.classList.remove('open');
                ylNavTrigger.closest('.yl-nav').classList.remove('open');
                ylNavTrigger.setAttribute('aria-expanded', 'false');
            });
        });
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.yl-nav')) {
                ylNavFlyout.classList.remove('open');
                ylNavTrigger.closest('.yl-nav').classList.remove('open');
                ylNavTrigger.setAttribute('aria-expanded', 'false');
            }
        });
    }
    document.querySelectorAll('.hub-pill').forEach((button) => {
        button.addEventListener('click', () => {
            if (button.dataset.year === 'resources') {
                state.activeYear = 'resources';
                syncYearIndicators();
                return;
            }
            setActiveYear(button.dataset.year);
        });
    });
    loadSubjects().catch(showError);
});

function showError(error) {
    const statusMessage = $('statusMessage');
    if (!statusMessage) {
        console.error(error);
        return;
    }
    statusMessage.textContent = `${error.message} Open this site through a web server, not directly as a file.`;
    statusMessage.classList.add('visible');
}
