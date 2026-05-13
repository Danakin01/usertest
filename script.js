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
    startTime = Date.now();
    questionsAnswered++;
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

    const timeSpent = (10 - timeLeft);
    totalTimeSpent += timeSpent;

    document.getElementById('explanation-text').textContent = "Time's up! " + q.explanation;
    document.getElementById('explanation-container').classList.remove('hidden');
    document.getElementById('next-btn').classList.remove('hidden');
}

function handleAnswer(selected, correct, element) {
    clearInterval(timerInterval);
    const timeSpent = (Date.now() - startTime) / 1000;
    totalTimeSpent += timeSpent;
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
    const avgSpeed = (totalTimeSpent / questionsAnswered).toFixed(1);
    
    document.getElementById('final-score').textContent = `${percent}%`;
    document.getElementById('metrics-answered').textContent = `${score}/${filteredQuestions.length}`;
    document.getElementById('metrics-speed').textContent = `${avgSpeed}s`;
    
    document.getElementById('progress-bar').style.width = '100%';

    let summary = '';
    if (percent >= 80) summary = "Excellent! The platform questions are factually consistent and the UI/UX supports rapid comprehension.";
    else if (percent >= 50) summary = "The platform is functional, but some questions may require refinement in clarity or distractor quality.";
    else summary = "High failure rate detected. Recommend a full review of the question bank and distractor logic.";

    document.getElementById('results-summary').textContent = summary;
}

function restart() {
    clearInterval(timerInterval);
    selectedCategories.clear();
    totalTimeSpent = 0;
    questionsAnswered = 0;
    switchView('landing-view');
    document.body.className = '';
    // Reset feedback section
    document.getElementById('feedback-section').classList.add('hidden');
    document.getElementById('feedback-success').classList.add('hidden');
    document.getElementById('qa-feedback-form').classList.remove('hidden');
}

function showFeedback() {
    const feedbackSection = document.getElementById('feedback-section');
    feedbackSection.classList.remove('hidden');
    feedbackSection.scrollIntoView({ behavior: 'smooth' });
}

async function submitFeedback(event) {
    event.preventDefault();
    const form = event.target;
    const btn = form.querySelector('button');
    const formData = new FormData(form);
    const action = form.getAttribute('action');

    // Simulate submission for demo purposes
    btn.disabled = true;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        // If the user has replaced 'YOUR_FORM_ID', attempt real submission
        if (!action.includes('YOUR_FORM_ID')) {
            await fetch(action, {
                method: 'POST',
                mode: 'no-cors', // Google Forms requires no-cors for AJAX submission
                body: formData
            });
        }
        
        // Success state
        setTimeout(() => {
            form.classList.add('hidden');
            document.getElementById('feedback-success').classList.remove('hidden');
        }, 1200);
    } catch (error) {
        console.error('Submission error:', error);
        btn.disabled = false;
        btn.innerHTML = originalContent;
        alert('There was an error submitting your feedback. Please try again.');
    }
}

function switchView(viewId) {
    ['landing-view', 'category-view', 'quiz-view', 'results-view'].forEach(id => {
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
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
