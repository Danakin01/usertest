let currentPlatform = '';
let allQuestions = [];
let filteredQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let selectedCategories = new Set();
let timerInterval;
let timeLeft = 10;

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
    if (selectedCategories.size === 0) {
        // If none selected, use all from that platform
        filteredQuestions = allQuestions.filter(q => 
            PLATFORM_CONFIG[currentPlatform].categories.some(c => c.toLowerCase() === q.category.toLowerCase())
        );
    } else {
        filteredQuestions = allQuestions.filter(q => 
            Array.from(selectedCategories).some(c => c.toLowerCase() === q.category.toLowerCase())
        );
    }

    if (filteredQuestions.length === 0) {
        alert('No questions found for the selected categories.');
        return;
    }

    // Shuffle and limit to 10 for a focused test session
    filteredQuestions = shuffleArray(filteredQuestions).slice(0, 10);
    
    currentQuestionIndex = 0;
    score = 0;
    switchView('quiz-view');
    showQuestion();
}

function showQuestion() {
    const q = filteredQuestions[currentQuestionIndex];
    document.getElementById('question-text').textContent = q.question;
    document.getElementById('question-counter').textContent = `Question ${currentQuestionIndex + 1}/${filteredQuestions.length}`;
    
    const progress = ((currentQuestionIndex) / filteredQuestions.length) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    // Handle incorrect_answers which is a stringified array in the JSON
    let incorrect;
    try {
        incorrect = typeof q.incorrect_answers === 'string' ? JSON.parse(q.incorrect_answers) : q.incorrect_answers;
    } catch (e) {
        incorrect = q.incorrect_answers;
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

        if (timeLeft <= 3) {
            timerDisplay.classList.add('warning');
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeout();
        }
    }, 1000);
}

function handleTimeout() {
    const q = filteredQuestions[currentQuestionIndex];
    const options = document.querySelectorAll('.option');
    options.forEach(opt => {
        opt.style.pointerEvents = 'none';
        if (opt.textContent === q.correct_answer) {
            opt.classList.add('correct');
        }
    });

    document.getElementById('explanation-text').textContent = "Time's up! " + q.explanation;
    document.getElementById('explanation-container').classList.remove('hidden');
    document.getElementById('next-btn').classList.remove('hidden');
}

function handleAnswer(selected, correct, element) {
    clearInterval(timerInterval);
    const options = document.querySelectorAll('.option');
    options.forEach(opt => opt.style.pointerEvents = 'none');

    if (selected === correct) {
        element.classList.add('correct');
        score++;
    } else {
        element.classList.add('wrong');
        // Find and highlight correct answer
        options.forEach(opt => {
            if (opt.textContent === correct) opt.classList.add('correct');
        });
    }

    document.getElementById('score-counter').textContent = `Score: ${score}`;
    
    // Show explanation
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
    const percent = Math.round((score / filteredQuestions.length) * 100);
    document.getElementById('final-score').textContent = percent;
    document.getElementById('progress-bar').style.width = '100%';

    let summary = '';
    if (percent >= 80) summary = "Excellent! The questions are clear and well-structured.";
    else if (percent >= 50) summary = "Good progress. Some areas might need further clarification.";
    else summary = "Testing reveals significant knowledge gaps or potential issues in question clarity.";

    document.getElementById('results-summary').textContent = summary;
}

function restart() {
    clearInterval(timerInterval);
    selectedCategories.clear();
    switchView('landing-view');
    document.body.className = '';
}

function switchView(viewId) {
    ['landing-view', 'category-view', 'quiz-view', 'results-view'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
