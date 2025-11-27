// ===========================
// GAME STATE & CONFIGURATION
// ===========================

const CONFIG = {
    gridSize: 4,
    shapes: ['circle', 'triangle', 'square', 'cross', 'star', 'diamond', 'hexagon'],
    totalLevels: 100,
    pointsPerCorrect: 10,
    pointsPerWrong: -5
};

let gameState = {
    level: 1,
    score: 0,
    correctAnswers: 0,
    totalQuestions: 0,
    startTime: null,
    timerInterval: null,
    currentPuzzle: null,
    isProcessing: false
};

// ===========================
// PUZZLE GENERATION
// ===========================

/**
 * Generate a valid complete grid using backtracking
 */
function generateValidGrid(size) {
    const grid = Array(size).fill(null).map(() => Array(size).fill(null));

    // Randomly select 'size' number of shapes from the total pool
    const allShapes = [...CONFIG.shapes].sort(() => Math.random() - 0.5);
    const availableShapes = allShapes.slice(0, size);

    function isValid(row, col, shape) {
        // Check row
        for (let c = 0; c < size; c++) {
            if (grid[row][c] === shape) return false;
        }
        // Check column
        for (let r = 0; r < size; r++) {
            if (grid[r][col] === shape) return false;
        }
        return true;
    }

    function fillGrid(row, col) {
        if (row === size) return true;

        const nextRow = col === size - 1 ? row + 1 : row;
        const nextCol = col === size - 1 ? 0 : col + 1;

        const shapes = [...availableShapes].sort(() => Math.random() - 0.5);

        for (const shape of shapes) {
            if (isValid(row, col, shape)) {
                grid[row][col] = shape;
                if (fillGrid(nextRow, nextCol)) return true;
                grid[row][col] = null;
            }
        }

        return false;
    }

    fillGrid(0, 0);
    return grid;
}

/**
 * Create a puzzle with more hints (5-6 shapes shown as clues)
 */
function createPuzzle(level) {
    // Determine grid size and number of hints based on level
    let gridSize, numHints;
    if (level <= 30) {
        gridSize = 4;
        numHints = 5; // 5 hints for easier levels
    } else if (level <= 70) {
        gridSize = 5;
        numHints = 6; // 6 hints for medium levels
    } else {
        gridSize = 4;
        numHints = 5; // Back to 4x4 with 5 hints for hard levels
    }

    // Generate complete solution
    const solution = generateValidGrid(gridSize);

    // Create empty puzzle grid
    const puzzleGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));

    // Get all possible positions
    const allPositions = [];
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            allPositions.push({ row: r, col: c });
        }
    }

    // Shuffle positions
    allPositions.sort(() => Math.random() - 0.5);

    // Select one position for the question
    const questionPos = allPositions[0];
    const questionRow = questionPos.row;
    const questionCol = questionPos.col;
    const correctAnswer = solution[questionRow][questionCol];

    // Select positions for hints (not including the question position)
    const availableForHints = allPositions.slice(1);
    const hintPositions = availableForHints.slice(0, numHints);

    // Place hints in the puzzle grid
    hintPositions.forEach(pos => {
        puzzleGrid[pos.row][pos.col] = solution[pos.row][pos.col];
    });

    // Determine the set of shapes used in this specific puzzle
    const shapesInPuzzle = new Set();
    solution.forEach(row => row.forEach(shape => shapesInPuzzle.add(shape)));
    const availableShapes = Array.from(shapesInPuzzle);

    // Generate answer options (correct answer + 3 wrong answers)
    const wrongAnswers = availableShapes.filter(s => s !== correctAnswer);

    // Shuffle and take 3 wrong answers
    wrongAnswers.sort(() => Math.random() - 0.5);
    const selectedWrong = wrongAnswers.slice(0, 3);

    // Combine and shuffle all options
    const answerOptions = [correctAnswer, ...selectedWrong];
    answerOptions.sort(() => Math.random() - 0.5);

    return {
        grid: puzzleGrid,
        gridSize,
        questionRow,
        questionCol,
        correctAnswer,
        answerOptions,
        solution // Keep solution for reference
    };
}

// ===========================
// GAME INITIALIZATION
// ===========================

function initGame() {
    gameState.level = 1;
    gameState.score = 0;
    gameState.correctAnswers = 0;
    gameState.totalQuestions = 0;

    loadNextPuzzle();
    updateStats();
}

function loadNextPuzzle() {
    gameState.currentPuzzle = createPuzzle(gameState.level);
    gameState.totalQuestions++;
    renderPuzzle();
    startTimer(); // Start 15s timer for this puzzle
}

function renderPuzzle() {
    const { grid, gridSize, questionRow, questionCol, answerOptions } = gameState.currentPuzzle;

    // Render grid
    const gridElement = document.getElementById('puzzle-grid');
    gridElement.innerHTML = '';
    gridElement.className = `puzzle-grid grid-${gridSize}x${gridSize}`;

    grid.forEach((row, rowIndex) => {
        row.forEach((shape, colIndex) => {
            const tile = document.createElement('div');
            tile.className = 'grid-tile';

            const isQuestion = rowIndex === questionRow && colIndex === questionCol;

            if (isQuestion) {
                tile.classList.add('question');
                tile.innerHTML = '<div class="question-mark">?</div>';
            } else {
                tile.innerHTML = createShapeSVG(shape);
            }

            gridElement.appendChild(tile);
        });
    });

    // Render answer options
    const optionsElement = document.getElementById('answer-options');
    optionsElement.innerHTML = '';

    answerOptions.forEach(shape => {
        const tile = document.createElement('div');
        tile.className = 'answer-tile';
        tile.dataset.shape = shape;
        tile.innerHTML = createShapeSVG(shape);
        tile.addEventListener('click', () => handleAnswerClick(shape, tile));
        optionsElement.appendChild(tile);
    });
}

function createShapeSVG(shape) {
    const svgMap = {
        circle: '<svg class="shape circle" viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" /></svg>',
        triangle: '<svg class="shape triangle" viewBox="0 0 100 100"><polygon points="50,15 85,85 15,85" /></svg>',
        square: '<svg class="shape square" viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="60" /></svg>',
        cross: '<svg class="shape cross" viewBox="0 0 100 100"><path d="M35,20 L65,20 L65,35 L80,35 L80,65 L65,65 L65,80 L35,80 L35,65 L20,65 L20,35 L35,35 Z" /></svg>',
        star: '<svg class="shape star" viewBox="0 0 100 100"><polygon points="50,15 61,40 88,40 67,57 75,82 50,65 25,82 33,57 12,40 39,40" /></svg>',
        diamond: '<svg class="shape diamond" viewBox="0 0 100 100"><polygon points="50,15 85,50 50,85 15,50" /></svg>',
        hexagon: '<svg class="shape hexagon" viewBox="0 0 100 100"><polygon points="50,15 80,30 80,70 50,85 20,70 20,30" /></svg>'
    };
    return svgMap[shape] || '';
}

// ===========================
// GAME LOGIC
// ===========================

function handleAnswerClick(selectedShape, tile) {
    if (gameState.isProcessing) return;

    gameState.isProcessing = true;
    clearInterval(gameState.timerInterval); // Stop timer immediately

    const { correctAnswer } = gameState.currentPuzzle;
    const isCorrect = selectedShape === correctAnswer;

    // Visual feedback on selected tile (if tile exists - might be null for timeout)
    if (tile) {
        tile.classList.add('selected');
    }

    // Disable all answer tiles
    document.querySelectorAll('.answer-tile').forEach(t => {
        t.style.pointerEvents = 'none';
    });

    setTimeout(() => {
        if (isCorrect) {
            if (tile) {
                tile.classList.remove('selected');
                tile.classList.add('correct');
            }
            gameState.score += CONFIG.pointsPerCorrect;
            gameState.correctAnswers++;
            showFeedback(true);

            // Fill in the correct answer in the grid
            fillQuestionCell(correctAnswer);

            setTimeout(() => {
                gameState.isProcessing = false;
                gameState.level++;
                updateStats();

                if (gameState.level > CONFIG.totalLevels) {
                    showVictory(true); // Game complete
                } else {
                    loadNextPuzzle();
                }
            }, 1500);
        } else {
            if (tile) {
                tile.classList.remove('selected');
                tile.classList.add('wrong');
            }
            gameState.score += CONFIG.pointsPerWrong;
            showFeedback(false, correctAnswer);

            // Highlight correct answer
            document.querySelectorAll('.answer-tile').forEach(t => {
                if (t.dataset.shape === correctAnswer) {
                    t.classList.add('correct');
                }
            });

            // Fill in the correct answer in the grid
            fillQuestionCell(correctAnswer);

            setTimeout(() => {
                gameState.isProcessing = false;
                gameState.level++;
                updateStats();

                if (gameState.level > CONFIG.totalLevels) {
                    showVictory(true); // Game complete
                } else {
                    loadNextPuzzle();
                }
            }, 2000);
        }
    }, 300);
}

function fillQuestionCell(shape) {
    const { questionRow, questionCol, gridSize } = gameState.currentPuzzle;
    const gridElement = document.getElementById('puzzle-grid');
    const tiles = gridElement.querySelectorAll('.grid-tile');
    const index = questionRow * gridSize + questionCol;
    const questionTile = tiles[index];

    if (questionTile) {
        questionTile.classList.remove('question');
        questionTile.innerHTML = createShapeSVG(shape);
    }
}

function showFeedback(isCorrect, correctAnswer = null) {
    if (isCorrect) {
        const feedback = document.getElementById('correct-feedback');
        feedback.classList.add('show');
        setTimeout(() => feedback.classList.remove('show'), 1500);
    } else {
        const feedback = document.getElementById('wrong-feedback');
        const answerText = document.getElementById('correct-answer-text');
        answerText.innerHTML = createShapeSVG(correctAnswer);
        feedback.classList.add('show');
        setTimeout(() => feedback.classList.remove('show'), 2000);
    }
}

// ===========================
// UI UPDATES
// ===========================

function updateStats() {
    document.getElementById('level-display').textContent = `${gameState.level} / ${CONFIG.totalLevels}`;
    document.getElementById('score-display').textContent = Math.max(0, gameState.score);
}

function startTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    let timeLeft = 15;
    const timerDisplay = document.getElementById('timer-display');
    timerDisplay.textContent = `0:${timeLeft.toString().padStart(2, '0')}`;
    timerDisplay.style.color = 'var(--text-primary)'; // Reset color

    gameState.timerInterval = setInterval(() => {
        timeLeft--;

        if (timeLeft <= 5) {
            timerDisplay.style.color = 'var(--accent-error)'; // Warn when low
        }

        timerDisplay.textContent = `0:${timeLeft.toString().padStart(2, '0')}`;

        if (timeLeft <= 0) {
            clearInterval(gameState.timerInterval);
            handleAnswerClick(null, null); // Trigger wrong answer (timeout)
        }
    }, 1000);
}

function showVictory(gameComplete = false) {
    clearInterval(gameState.timerInterval);

    const modal = document.getElementById('victory-modal');
    const title = document.getElementById('modal-title');
    const message = document.getElementById('modal-message');
    const nextBtn = document.getElementById('next-level-btn');

    if (gameComplete) {
        title.textContent = '🎊 Game Complete! 🎊';
        message.textContent = `Congratulations! You've completed all ${CONFIG.totalLevels} levels!`;
        nextBtn.textContent = 'Play Again';
    } else {
        title.textContent = `Level ${gameState.level} Complete!`;
        message.textContent = `Great job! Ready for the next challenge?`;
        nextBtn.textContent = 'Next Level';
    }

    const accuracy = Math.round((gameState.correctAnswers / gameState.totalQuestions) * 100);

    document.getElementById('final-score').textContent = Math.max(0, gameState.score);
    document.getElementById('final-accuracy').textContent = `${accuracy}%`;

    modal.classList.add('active');
}

function hideVictory() {
    document.getElementById('victory-modal').classList.remove('active');
}

// ===========================
// EVENT LISTENERS
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    initGame();

    document.getElementById('next-level-btn').addEventListener('click', () => {
        hideVictory();
        if (gameState.level > CONFIG.totalLevels) {
            initGame(); // Restart game
        } else {
            loadNextPuzzle();
        }
    });

    // Modal click outside to close
    document.getElementById('victory-modal').addEventListener('click', (e) => {
        if (e.target.id === 'victory-modal') {
            hideVictory();
        }
    });

    // Keyboard shortcuts (1-5 for answer selection)
    document.addEventListener('keydown', (e) => {
        if (gameState.isProcessing) return;

        if (e.key >= '1' && e.key <= '5') {
            const index = parseInt(e.key) - 1;
            const answerTiles = document.querySelectorAll('.answer-tile');
            if (answerTiles[index]) {
                const shape = answerTiles[index].dataset.shape;
                handleAnswerClick(shape, answerTiles[index]);
            }
        }
    });
});
