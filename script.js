let currentPlatform = '';
let allQuestions = [];
let filteredQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let selectedCategories = new Set();
let timerInterval;
let timeLeft = 10;
let startTime;
let totalTimeSpent = 0;
let questionsAnswered = 0;

const PLATFORM_CONFIG = {
    cashrush: {
        file: 'cashquestions.json',
        title: 'CashRush Finance',
        theme: 'cr-theme',
        categories: [
            'Personal Finance 101',
            'Investment Basics',
            'Compound Finance',
            'Portfolio Diversification',
            'Risk & Insurance',
            'Fintech & Digital Payments'
        ]
    },
    mindquest: {
        file: 'mindquest.json',
        title: 'MindQuest Wellness',
        theme: 'mq-theme',
        categories: [
            'Emotional',
            'Physical',
            'Psychological',
            'Social',
            'General Wellness'
        ]
    }
};

async function selectPlatform(platform) {
    currentPlatform = platform;
    document.body.className = PLATFORM_CONFIG[platform].theme;
    document.getElementById('platform-title').textContent = PLATFORM_CONFIG[platform].title;

    // Show loading state if needed
    try {
        const response = await fetch(PLATFORM_CONFIG[platform].file);
        allQuestions = await response.json();

        // Populate categories
        const categoryList = document.getElementById('category-list');
        categoryList.innerHTML = '';

        const availableCategories = PLATFORM_CONFIG[platform].categories;

        availableCategories.forEach(cat => {
            const chip = document.createElement('div');
            chip.className = 'chip';
            chip.textContent = cat;
            chip.onclick = () => toggleCategory(cat, chip);
            categoryList.appendChild(chip);
        });

        switchView('category-view');
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Failed to load questions. Please ensure the JSON files are in the directory.');
    }
}

function toggleCategory(category, element) {
    // Clear previous selection to allow only one category
    const chips = document.querySelectorAll('.chip');
    chips.forEach(c => c.classList.remove('active'));

    if (selectedCategories.has(category)) {
        selectedCategories.clear();
    } else {
        selectedCategories.clear();
        selectedCategories.add(category);
        element.classList.add('active');
    }
}

function startQuiz() {
    const platformCats = PLATFORM_CONFIG[currentPlatform].categories.map(c => c.toLowerCase());

    if (selectedCategories.size === 0) {
        // Use all from platform if none selected
        filteredQuestions = allQuestions.filter(q =>
            q.category && platformCats.includes(q.category.toLowerCase())
        );
    } else {
        const selected = Array.from(selectedCategories).map(c => c.toLowerCase());
        filteredQuestions = allQuestions.filter(q =>
            q.category && selected.includes(q.category.toLowerCase())
        );
    }

    if (filteredQuestions.length === 0) {
        alert('No questions found for the selected categories.');
        return;
    }

    // Shuffle and cap at 10
    filteredQuestions = shuffleArray(filteredQuestions).slice(0, 10);

    currentQuestionIndex = 0;
    score = 0;
    totalTimeSpent = 0;
    questionsAnswered = 0;
    switchView('quiz-view');
    showQuestion();
}

function showQuestion() {
    const q = filteredQuestions[currentQuestionIndex];
    if (!q) {
        showResults();
        return;
    }

    document.getElementById('question-text').textContent = q.question;
    document.getElementById('question-counter').textContent = `Question ${currentQuestionIndex + 1}/${filteredQuestions.length}`;

    const progress = ((currentQuestionIndex) / filteredQuestions.length) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    let incorrect;
    try {
        incorrect = typeof q.incorrect_answers === 'string' ? JSON.parse(q.incorrect_answers) : q.incorrect_answers;
    } catch (e) {
        incorrect = Array.isArray(q.incorrect_answers) ? q.incorrect_answers : [];
    }

    const allOptions = shuffleArray([q.correct_answer, ...incorrect]);

    allOptions.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'option';
        div.textContent = opt;
        div.onclick = () => handleAnswer(opt, q.correct_answer, div);
        optionsContainer.appendChild(div);
    });

    document.getElementById('explanation-container').classList.add('hidden');
    document.getElementById('next-btn').classList.add('hidden');

    startTimer();
    startTime = Date.now();
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 10;
    const timerDisplay = document.getElementById('timer-display');
    timerDisplay.textContent = `${timeLeft}s`;
    timerDisplay.classList.remove('warning');

    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = `${timeLeft}s`;

        if (timeLeft <= 3) timerDisplay.classList.add('warning');

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeout();
        }
    }, 1000);
}

function handleTimeout() {
    const q = filteredQuestions[currentQuestionIndex];
    questionsAnswered++;
    totalTimeSpent += 10;

    const options = document.querySelectorAll('.option');
    options.forEach(opt => {
        opt.style.pointerEvents = 'none';
        if (opt.textContent === q.correct_answer) opt.classList.add('correct');
    });

    document.getElementById('explanation-text').textContent = "Time's up! " + q.explanation;
    document.getElementById('explanation-container').classList.remove('hidden');
    document.getElementById('next-btn').classList.remove('hidden');
}

function handleAnswer(selected, correct, element) {
    clearInterval(timerInterval);
    const timeSpent = (Date.now() - startTime) / 1000;
    totalTimeSpent += timeSpent;
    questionsAnswered++;

    const options = document.querySelectorAll('.option');
    options.forEach(opt => opt.style.pointerEvents = 'none');

    if (selected === correct) {
        element.classList.add('correct');
        score++;
    } else {
        element.classList.add('wrong');
        options.forEach(opt => {
            if (opt.textContent === correct) opt.classList.add('correct');
        });
    }

    const q = filteredQuestions[currentQuestionIndex];
    document.getElementById('explanation-text').textContent = q.explanation;
    document.getElementById('explanation-container').classList.remove('hidden');
    document.getElementById('next-btn').classList.remove('hidden');
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < filteredQuestions.length) {
        showQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    switchView('results-view');
    const total = filteredQuestions.length || 1;
    const percent = Math.round((score / total) * 100);
    const avgSpeed = questionsAnswered > 0 ? (totalTimeSpent / questionsAnswered).toFixed(1) : 0;

    document.getElementById('final-score').textContent = `${percent}%`;
    document.getElementById('metrics-answered').textContent = `${score}/${total}`;
    document.getElementById('metrics-speed').textContent = `${avgSpeed}s`;

    let summary = '';
    if (percent >= 80) summary = "Excellent! The questions are factually consistent.";
    else if (percent >= 50) summary = "Some questions may require refinement in clarity or distractor quality.";
    else summary = "High failure rate detected. Recommend a full review of the question bank and distractor logic.";

    document.getElementById('results-summary').textContent = summary;
}

function restart() {
    clearInterval(timerInterval);
    selectedCategories.clear();
    switchView('landing-view');
    document.body.className = '';
    document.getElementById('feedback-section').classList.add('hidden');
}

function showFeedback() {
    const feedbackSection = document.getElementById('feedback-section');
    feedbackSection.classList.toggle('hidden');
    if (!feedbackSection.classList.contains('hidden')) {
        feedbackSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function switchView(viewId) {
    const views = ['landing-view', 'category-view', 'quiz-view', 'results-view'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');
        window.scrollTo(0, 0);
    }
}

function shuffleArray(array) {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}
