document.addEventListener('DOMContentLoaded', () => {
    // --- Selezione Elementi DOM ---
    // Quiz elements
    const quizSetupContainer = document.getElementById('quiz-setup-container');
    const vetrinaGridQuiz = document.getElementById('vetrina-grid-quiz');
    const startExerciseButton = document.getElementById('start-exercise-button');
    const selectionFeedback = document.getElementById('selection-feedback');
    const flashcardContainer = document.getElementById('flashcard');
    const birdImage = document.getElementById('bird-image');
    const optionsContainer = document.getElementById('multiple-choice-options');
    const nextButton = document.getElementById('next-card');
    const feedbackPara = document.getElementById('feedback');
    const correctAnswerPara = document.getElementById('correct-answer');
    // PDF Viewer element
    const pdfViewerContainer = document.getElementById('pdf-viewer-container'); // NEW
    // Shared elements
    const loadingIndicator = document.getElementById('loading');
    const modeSwitchButton = document.getElementById('mode-switch-button');
    const bodyElement = document.body;

    // --- Stato Applicazione Globale ---
    let appMode = 'quiz'; // 'quiz' or 'pdf'
    let isLoading = false;
    let allBirdsData = [];
    let allVetrine = [];
    // Quiz specific state
    let currentCorrectName = '';
    let currentFilteredBirds = [];
    let currentVetrinaSelectionQuiz = []; // Vetrine selected for the quiz

    // --- Funzioni Helper ---

    /** Mostra/Nasconde indicatore e disabilita/abilita controlli base */
    function setLoadingState(loading) {
        isLoading = loading;
        if (loadingIndicator) {
            loadingIndicator.style.display = loading ? 'block' : 'none';
        }
        // Disable relevant controls based on mode and loading state
        if (appMode === 'quiz') {
            // Add null check for startExerciseButton
            if (startExerciseButton) {
                startExerciseButton.disabled = loading || currentVetrinaSelectionQuiz.length === 0;
            }
            // Add null check for flashcardContainer before accessing style
            if (flashcardContainer && flashcardContainer.style.display !== 'none') { // Only disable quiz options if quiz is active
                 // Add null check for nextButton
                 if (nextButton) {
                     nextButton.disabled = loading;
                 }
                 // Add null check for optionsContainer - This prevents the error
                 if (optionsContainer) {
                     optionsContainer.querySelectorAll('button').forEach(button => button.disabled = loading);
                 }
            }
        } // No specific controls to disable in PDF mode currently

        // Add null check for modeSwitchButton
        if (modeSwitchButton) {
            modeSwitchButton.disabled = loading;
        }

        // Disable interaction with vetrina cards during loading (Only Quiz grid now)
        const grids = [vetrinaGridQuiz]; // REMOVED vetrinaGridGallery
        grids.forEach(grid => {
            if (grid) {
                grid.querySelectorAll('.vetrina-item').forEach(item => {
                    item.style.pointerEvents = loading ? 'none' : 'auto';
                    item.style.opacity = loading ? '0.7' : '1';
                });
            }
        });
    }

    /** Normalizza testo per confronto semplice */
    function normalizeText(text = '') {
        return text.toLowerCase().trim();
    }

    /** Mescola un array (algoritmo Fisher-Yates) */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; // Scambia elementi
        }
        return array;
    }


    // --- Logica Principale ---

    /** 1. Carica i dati da data.json all'avvio */
    async function loadAppData() {
        console.log("Caricamento dati da data.json...");
        setLoadingState(true);
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error(`Errore HTTP ${response.status}: Impossibile caricare data.json`);
            const data = await response.json();
            // Only need vetrine and birds for the quiz now
            if (!data || !data.vetrine || !data.birds) throw new Error("Formato data.json non valido (mancano 'vetrine' o 'birds').");

            allVetrine = data.vetrine;
            allBirdsData = data.birds;
            console.log(`Dati caricati: ${allVetrine.length} vetrine, ${allBirdsData.length} uccelli.`);

            renderVetrinaGrids(); // Popola solo la griglia del quiz

        } catch (error) {
            console.error("Errore caricamento/parsing data.json:", error);
            // Display error only in quiz grid location
            const errorMsg = `<p class="feedback-error">Errore fatale: Impossibile caricare i dati. ${error.message}</p>`;
            if (vetrinaGridQuiz) vetrinaGridQuiz.innerHTML = errorMsg;
            // Disable buttons if data fails
            if (startExerciseButton) startExerciseButton.disabled = true;
            if (modeSwitchButton) modeSwitchButton.disabled = true;
        } finally {
            setLoadingState(false);
            updateUIVisibility(); // Ensure correct view is shown initially
        }
    }

    /** 2. Crea la griglia di vetrine (solo per Quiz) */
    function renderVetrinaGrids() {
        // Clear only quiz grid
        if (vetrinaGridQuiz) vetrinaGridQuiz.innerHTML = '';
        else {
            console.error("Elemento vetrinaGridQuiz non trovato!");
            return; // Cannot render if grid doesn't exist
        }


        if (allVetrine.length === 0) {
            const noVetrinaMsg = `<p>Nessuna vetrina disponibile.</p>`;
            vetrinaGridQuiz.innerHTML = noVetrinaMsg;
            if (startExerciseButton) startExerciseButton.disabled = true;
            return;
        }

        allVetrine.forEach(vetrinaName => {
            const displayName = vetrinaName.replace(/^vetrina\s+/i, '');

            // Create card ONLY for Quiz grid
            const cardQuiz = createVetrinaCard(vetrinaName, displayName);
            cardQuiz.addEventListener('click', handleVetrinaClickQuizMode);
            vetrinaGridQuiz.appendChild(cardQuiz);

        });

        validateVetrinaSelectionQuiz(); // Validate quiz selection initially
    }

    /** Helper to create a single vetrina card element */
    function createVetrinaCard(vetrinaName, displayName) {
        const card = document.createElement('div');
        card.classList.add('vetrina-item');
        card.textContent = displayName;
        card.dataset.vetrina = vetrinaName;
        return card;
    }

    /** Gestisce click su vetrina in modalità QUIZ */
    function handleVetrinaClickQuizMode(event) {
        if (isLoading) return;
        const card = event.currentTarget;
        card.classList.toggle('selected');
        validateVetrinaSelectionQuiz();
    }

    // REMOVE handleVetrinaClickGalleryMode function

    /** Valida la selezione delle vetrine per il QUIZ */
    function validateVetrinaSelectionQuiz() {
        // Add null check for vetrinaGridQuiz
        if (!vetrinaGridQuiz) return false;

        const selectedItems = vetrinaGridQuiz.querySelectorAll('.vetrina-item.selected');
        currentVetrinaSelectionQuiz = Array.from(selectedItems).map(item => item.dataset.vetrina);

        const hasSelection = currentVetrinaSelectionQuiz.length > 0;
        // Add null checks for feedback/button elements
        if (selectionFeedback) selectionFeedback.style.display = hasSelection ? 'none' : 'block';
        if (startExerciseButton) startExerciseButton.disabled = isLoading || !hasSelection;

        // If user deselects all vetrine while quiz is running, hide the flashcard
        if (!hasSelection && flashcardContainer && flashcardContainer.style.display !== 'none') {
             flashcardContainer.style.display = 'none';
        }
        return hasSelection;
    }

    // ... handleStartExercise, displayNewCard, createOptionButtons, handleChoiceClick remain the same ...
    // ... Make sure they have null checks for elements they use ...

    /** 3. Gestisce il click su "Avvia / Aggiorna Esercizio" (QUIZ) */
    function handleStartExercise() {
        if (!validateVetrinaSelectionQuiz()) return; // Ensure selection is still valid

        console.log("Avvio/Aggiornamento ESERCIZIO con vetrine:", currentVetrinaSelectionQuiz);

        currentFilteredBirds = allBirdsData.filter(bird =>
            currentVetrinaSelectionQuiz.includes(bird.vetrina)
        );
        console.log(`Filtrati ${currentFilteredBirds.length} uccelli per l'esercizio.`);

        // Add null checks for feedback/UI elements
        if (currentFilteredBirds.length === 0) {
             if (feedbackPara) {
                 feedbackPara.textContent = "Nessun uccello trovato per le vetrine selezionate.";
                 feedbackPara.className = 'feedback-error';
             }
             if (optionsContainer) optionsContainer.innerHTML = '';
             if (birdImage) birdImage.style.display = 'none';
             if (nextButton) nextButton.style.display = 'none';
        } else {
             displayNewCard(); // Mostra la prima card filtrata
        }
        if (flashcardContainer) flashcardContainer.style.display = 'flex'; // Mostra contenitore quiz
    }

    /** 4. Mostra una nuova card (QUIZ) */
    function displayNewCard() {
        if (isLoading) return;
        if (currentFilteredBirds.length === 0) {
             console.error("displayNewCard chiamata ma non ci sono uccelli filtrati.");
             if (feedbackPara) {
                 feedbackPara.textContent = "Errore: nessun uccello disponibile per le vetrine selezionate.";
                 feedbackPara.className = 'feedback-error';
             }
             if (optionsContainer) optionsContainer.innerHTML = '';
             if (birdImage) birdImage.style.display = 'none';
             if (nextButton) nextButton.style.display = 'none';
             return;
        }

        setLoadingState(true);

        // Add null checks
        if (feedbackPara) { feedbackPara.textContent = ''; feedbackPara.className = ''; }
        if (correctAnswerPara) { correctAnswerPara.style.display = 'none'; correctAnswerPara.textContent = ''; }
        if (optionsContainer) optionsContainer.innerHTML = '';
        if (nextButton) nextButton.style.display = 'none';
        if (birdImage) { birdImage.style.display = 'none'; birdImage.src = ''; }


        const correctBird = currentFilteredBirds[Math.floor(Math.random() * currentFilteredBirds.length)];
        currentCorrectName = correctBird.name;

        let wrongOptions = [];
        const possibleWrongBirds = allBirdsData.filter(bird => bird.name !== currentCorrectName); // Use all birds for wrong options for more variety
        const numWrongToSample = Math.min(2, possibleWrongBirds.length);

        if (numWrongToSample > 0) {
            let sampledNames = new Set();
            while(sampledNames.size < numWrongToSample && sampledNames.size < possibleWrongBirds.length) {
                 let potentialWrong = possibleWrongBirds[Math.floor(Math.random() * possibleWrongBirds.length)];
                 sampledNames.add(potentialWrong.name);
            }
            wrongOptions = Array.from(sampledNames);
        }

        let options = [currentCorrectName, ...wrongOptions];
        options = shuffleArray(options);

        console.log(`Mostrando card: Corretto='${currentCorrectName}', Opzioni=${options}`);

        if (birdImage) {
            birdImage.alt = `Immagine di ${currentCorrectName}`;
            birdImage.onload = null; birdImage.onerror = null; // Clear previous handlers
            birdImage.onload = () => {
                console.log("Immagine caricata:", correctBird.image_path);
                birdImage.style.display = 'block';
                createOptionButtons(options); // Create buttons only after image loads
                setLoadingState(false);
                birdImage.onerror = null; // Clear error handler on success
            };
            birdImage.onerror = () => {
                console.error("Errore caricamento immagine:", correctBird.image_path);
                if (feedbackPara) {
                    feedbackPara.textContent = "Errore caricamento immagine.";
                    feedbackPara.className = 'feedback-error';
                }
                birdImage.style.display = 'none'; // Hide broken image placeholder
                // Still show options and next button even if image fails? Yes.
                createOptionButtons(options);
                setLoadingState(false);
                if (nextButton) { nextButton.style.display = 'block'; nextButton.disabled = false; } // Allow skipping
            };
            birdImage.src = correctBird.image_path;
        } else {
             // If birdImage element doesn't exist, still show options
             createOptionButtons(options);
             setLoadingState(false);
        }
    }


    /** 5. Crea i bottoni delle opzioni (QUIZ) */
    function createOptionButtons(options) {
        // Add null check
        if (!optionsContainer) return;

        optionsContainer.innerHTML = '';
        if (!options || options.length === 0) {
            optionsContainer.innerHTML = "<p>Opzioni non disponibili.</p>"; return;
        }
        options.forEach(optionText => {
            const button = document.createElement('button');
            button.textContent = optionText;
            button.classList.add('choice-button');
            button.addEventListener('click', handleChoiceClick);
            optionsContainer.appendChild(button);
        });
    }

    /** 6. Gestisce il click su un bottone-opzione (QUIZ) */
    function handleChoiceClick(event) {
        if (isLoading) return;
        // Add null checks
        if (!optionsContainer || !feedbackPara || !correctAnswerPara || !nextButton) return;

        const chosenButton = event.target;
        const chosenAnswer = chosenButton.textContent;
        optionsContainer.querySelectorAll('button').forEach(button => button.disabled = true);
        const isCorrect = normalizeText(chosenAnswer) === normalizeText(currentCorrectName);

        feedbackPara.textContent = ''; // Clear previous feedback text
        if (isCorrect) {
            feedbackPara.className = 'feedback-correct'; // Use classes for styling hints if needed
            chosenButton.classList.add('correct');
        } else {
            feedbackPara.className = 'feedback-incorrect';
            chosenButton.classList.add('incorrect');
            correctAnswerPara.textContent = `Risposta corretta: ${currentCorrectName}`;
            correctAnswerPara.style.display = 'block';
            // Highlight the correct button
            optionsContainer.querySelectorAll('button').forEach(button => {
                 if (normalizeText(button.textContent) === normalizeText(currentCorrectName)) {
                     button.classList.add('correct');
                 }
            });
        }
        nextButton.style.display = 'block'; nextButton.disabled = false;
        nextButton.focus();
    }


    // REMOVE displayGalleryForVetrina function

    /** 8. Gestisce il cambio modalità (Quiz <-> PDF) */
    function handleModeSwitch() {
        if (isLoading) return;

        // Toggle between 'quiz' and 'pdf'
        appMode = (appMode === 'quiz') ? 'pdf' : 'quiz';
        console.log(`Cambiando modalità a: ${appMode}`);

        updateUIVisibility();
        resetUIState(); // Clear selections/content when switching modes
        // No need to auto-load anything for PDF mode
    }

    /** 9. Aggiorna visibilità UI in base alla modalità */
    function updateUIVisibility() {
        // Trova l'icona span dentro il bottone
        const iconSpan = modeSwitchButton ? modeSwitchButton.querySelector('span.material-symbols-outlined') : null;

        // Assicurati che gli elementi esistano prima di modificarli
        if (!quizSetupContainer || !pdfViewerContainer) {
            console.error("Elementi container mancanti (quizSetupContainer o pdfViewerContainer)");
            return;
        }

        if (appMode === 'quiz') {
            bodyElement.classList.remove('pdf-mode');
            bodyElement.classList.add('quiz-mode');

            // Mostra il setup del quiz, nascondi il visualizzatore PDF
            quizSetupContainer.style.display = 'block'; // O 'flex', 'grid', ecc. se necessario
            pdfViewerContainer.style.display = 'none';

            // Imposta icona per indicare "Vai al PDF"
            if (iconSpan) iconSpan.textContent = 'picture_as_pdf'; // Icona PDF
            if (modeSwitchButton) modeSwitchButton.title = 'Visualizza PDF'; // Aggiorna tooltip
            // La visibilità della flashcard è gestita altrove
        } else { // pdf mode
            bodyElement.classList.remove('quiz-mode');
            bodyElement.classList.add('pdf-mode');

            // Nascondi il setup del quiz, mostra il visualizzatore PDF
            quizSetupContainer.style.display = 'none';
            pdfViewerContainer.style.display = 'block'; // O 'flex', 'grid', ecc. se necessario

            // Imposta icona per indicare "Vai al Quiz"
            if (iconSpan) iconSpan.textContent = 'quiz'; // Icona Quiz
            if (modeSwitchButton) modeSwitchButton.title = 'Vai al Quiz'; // Aggiorna tooltip
            if (flashcardContainer) flashcardContainer.style.display = 'none'; // Assicurati che la flashcard sia nascosta
        }

        // Assicurati che l'indicatore di caricamento sia spento se non sta caricando
        if (!isLoading) {
            setLoadingState(false);
        }
    }

     /** 10. Resetta stato UI quando si cambia modalità */
     function resetUIState() {
         // Reset quiz state
         if (vetrinaGridQuiz) vetrinaGridQuiz.querySelectorAll('.vetrina-item.selected').forEach(item => item.classList.remove('selected'));
         currentVetrinaSelectionQuiz = [];
         if (flashcardContainer) flashcardContainer.style.display = 'none';
         if (feedbackPara) feedbackPara.textContent = '';
         if (correctAnswerPara) correctAnswerPara.style.display = 'none';
         if (optionsContainer) optionsContainer.innerHTML = '';
         if (birdImage) birdImage.src = '';
         validateVetrinaSelectionQuiz(); // Update quiz button state

         // No gallery state to reset anymore
         // No specific PDF state to reset (iframe src is static)
     }


    // --- Event Listeners ---
    // Add null checks before adding listeners
    if (startExerciseButton) startExerciseButton.addEventListener('click', handleStartExercise);
    if (nextButton) nextButton.addEventListener('click', displayNewCard);
    if (modeSwitchButton) modeSwitchButton.addEventListener('click', handleModeSwitch);

    // --- Inizializzazione ---
    loadAppData(); // Carica i dati e renderizza la griglia del quiz

}); // Fine DOMContentLoaded