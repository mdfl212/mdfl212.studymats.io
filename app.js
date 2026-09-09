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
    state.questions = await response.json();
    state.answers = {};
    state.revealed = {};
    state.currentIndex = 0;
    document.documentElement.style.setProperty('--accent', subject.colors.accent);
    document.documentElement.style.setProperty('--accent-soft', subject.colors.accentSoft);
    $('headerEyebrow').textContent = `${subject.icon} ${subject.name} question bank`;
    $('headerTitle').innerHTML = `<em>${escapeHtml(subject.shortName || subject.name)}</em><br>Question Reviewer`;
    $('headerSubtitle').textContent = subject.description;
    syncYearIndicators();
    populateTopics();
    applyFilters();
}

function populateTopics() {
    const topics = [...new Set(state.questions.map((question) => question.topic).filter(Boolean))].sort();
    $('topicFilter').innerHTML = '<option value="all">All topics</option>' +
        topics.map((topic) => `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`).join('');
    state.filters.topic = 'all';
    if ($('topicFilter')) {
        $('topicFilter').value = 'all';
    }
}

function applyFilters() {
    state.filteredQuestions = state.questions.filter((question) =>
        state.filters.topic === 'all' || question.topic === state.filters.topic);
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
                <td>${escapeHtml(question.question)}</td>
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
    $('questionContent').innerHTML = `
        <div class="q-meta"><span class="q-num">Q${state.currentIndex + 1}</span>
            <span class="badge badge-theme">${escapeHtml(question.topic)}</span>
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
    render();
}

document.addEventListener('DOMContentLoaded', () => {
    const subjectSelect = $('subjectSelect');
    const topicFilter = $('topicFilter');
    const previousButton = $('previousButton');
    const nextButton = $('nextButton');
    const scoreButton = $('scoreButton');
    const resetButton = $('resetButton');
    const tableToggleButton = $('tableToggleButton');
    const tableSearch = $('tableSearch');
    const closeScoreButton = $('closeScoreButton');
    const ylNavTrigger = $('ylNavTrigger');
    const ylNavFlyout = $('ylNavFlyout');

    if (subjectSelect) {
        subjectSelect.addEventListener('change', (event) => selectSubject(event.target.value).catch(showError));
    }
    if (topicFilter) {
        topicFilter.addEventListener('change', (event) => { state.filters.topic = event.target.value; applyFilters(); });
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
