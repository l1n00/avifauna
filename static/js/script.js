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
    // Gallery elements
    const galleryViewContainer = document.getElementById('gallery-view');
    const vetrinaGridGallery = document.getElementById('vetrina-grid-gallery');
    const galleryContentContainer = document.getElementById('gallery-content');
    // Shared elements
    const loadingIndicator = document.getElementById('loading');
    const modeSwitchButton = document.getElementById('mode-switch-button');
    const bodyElement = document.body;

    // --- Stato Applicazione Globale ---
    let appMode = 'quiz'; // 'quiz' or 'gallery'
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
        }
        // Add null check for modeSwitchButton
        if (modeSwitchButton) {
            modeSwitchButton.disabled = loading;
        }

        // Disable interaction with vetrina cards during loading
        const grids = [vetrinaGridQuiz, vetrinaGridGallery];
        grids.forEach(grid => {
            // Check if grid element exists (already correctly done)
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
            if (!data || !data.vetrine || !data.birds) throw new Error("Formato data.json non valido.");

            allVetrine = data.vetrine;
            allBirdsData = data.birds;
            console.log(`Dati caricati: ${allVetrine.length} vetrine, ${allBirdsData.length} uccelli.`);

            renderVetrinaGrids(); // Popola entrambe le griglie

        } catch (error) {
            console.error("Errore caricamento/parsing data.json:", error);
            // Display error in both potential grid locations
            const errorMsg = `<p class="feedback-error">Errore fatale: Impossibile caricare i dati. ${error.message}</p>`;
            if (vetrinaGridQuiz) vetrinaGridQuiz.innerHTML = errorMsg;
            if (vetrinaGridGallery) vetrinaGridGallery.innerHTML = errorMsg;
            startExerciseButton.disabled = true;
            modeSwitchButton.disabled = true;
        } finally {
            setLoadingState(false);
            updateUIVisibility(); // Ensure correct view is shown initially
        }
    }

    /** 2. Crea le griglie di vetrine (per Quiz e Galleria) */
    function renderVetrinaGrids() {
        // Clear both grids
        if (vetrinaGridQuiz) vetrinaGridQuiz.innerHTML = '';
        if (vetrinaGridGallery) vetrinaGridGallery.innerHTML = '';

        if (allVetrine.length === 0) {
            const noVetrinaMsg = `<p>Nessuna vetrina disponibile.</p>`;
            if (vetrinaGridQuiz) vetrinaGridQuiz.innerHTML = noVetrinaMsg;
            if (vetrinaGridGallery) vetrinaGridGallery.innerHTML = noVetrinaMsg;
            startExerciseButton.disabled = true;
            return;
        }

        allVetrine.forEach(vetrinaName => {
            const displayName = vetrinaName.replace(/^vetrina\s+/i, '');

            // Create card for Quiz grid
            if (vetrinaGridQuiz) {
                const cardQuiz = createVetrinaCard(vetrinaName, displayName);
                cardQuiz.addEventListener('click', handleVetrinaClickQuizMode);
                vetrinaGridQuiz.appendChild(cardQuiz);
            }

            // Create card for Gallery grid
            if (vetrinaGridGallery) {
                const cardGallery = createVetrinaCard(vetrinaName, displayName);
                cardGallery.addEventListener('click', handleVetrinaClickGalleryMode);
                vetrinaGridGallery.appendChild(cardGallery);
            }
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

    /** Gestisce click su vetrina in modalità GALLERIA */
    function handleVetrinaClickGalleryMode(event) {
        if (isLoading) return;
        const card = event.currentTarget;
        const vetrinaName = card.dataset.vetrina;

        // Highlight active vetrina in gallery grid
        if (vetrinaGridGallery) {
             vetrinaGridGallery.querySelectorAll('.vetrina-item.active').forEach(item => item.classList.remove('active'));
        }
        card.classList.add('active');

        displayGalleryForVetrina(vetrinaName);
    }


    /** Valida la selezione delle vetrine per il QUIZ */
    function validateVetrinaSelectionQuiz() {
        const selectedItems = vetrinaGridQuiz.querySelectorAll('.vetrina-item.selected');
        currentVetrinaSelectionQuiz = Array.from(selectedItems).map(item => item.dataset.vetrina);

        const hasSelection = currentVetrinaSelectionQuiz.length > 0;
        selectionFeedback.style.display = hasSelection ? 'none' : 'block';
        startExerciseButton.disabled = isLoading || !hasSelection;

        // If user deselects all vetrine while quiz is running, hide the flashcard
        if (!hasSelection && flashcardContainer.style.display !== 'none') {
             flashcardContainer.style.display = 'none';
        }
        return hasSelection;
    }

    /** 3. Gestisce il click su "Avvia / Aggiorna Esercizio" (QUIZ) */
    function handleStartExercise() {
        if (!validateVetrinaSelectionQuiz()) return; // Ensure selection is still valid

        console.log("Avvio/Aggiornamento ESERCIZIO con vetrine:", currentVetrinaSelectionQuiz);

        currentFilteredBirds = allBirdsData.filter(bird =>
            currentVetrinaSelectionQuiz.includes(bird.vetrina)
        );
        console.log(`Filtrati ${currentFilteredBirds.length} uccelli per l'esercizio.`);

        if (currentFilteredBirds.length === 0) {
             feedbackPara.textContent = "Nessun uccello trovato per le vetrine selezionate.";
             feedbackPara.className = 'feedback-error';
             optionsContainer.innerHTML = '';
             birdImage.style.display = 'none';
             nextButton.style.display = 'none';
        } else {
             displayNewCard(); // Mostra la prima card filtrata
        }
        flashcardContainer.style.display = 'flex'; // Mostra contenitore quiz
    }

    /** 4. Mostra una nuova card (QUIZ) (Mostly Unchanged) */
    function displayNewCard() {
        // ... (Keep the existing displayNewCard function logic as is) ...
        // Make sure it uses `currentFilteredBirds` and `currentCorrectName`
        // Ensure setLoadingState is called appropriately within this function
        if (isLoading) return;
        if (currentFilteredBirds.length === 0) {
             console.error("displayNewCard chiamata ma non ci sono uccelli filtrati.");
             feedbackPara.textContent = "Errore: nessun uccello disponibile per le vetrine selezionate.";
             feedbackPara.className = 'feedback-error';
             optionsContainer.innerHTML = ''; birdImage.style.display = 'none'; nextButton.style.display = 'none';
             return;
        }

        setLoadingState(true);

        feedbackPara.textContent = ''; feedbackPara.className = '';
        correctAnswerPara.style.display = 'none'; correctAnswerPara.textContent = '';
        optionsContainer.innerHTML = '';
        nextButton.style.display = 'none';
        birdImage.style.display = 'none'; birdImage.src = '';

        const correctBird = currentFilteredBirds[Math.floor(Math.random() * currentFilteredBirds.length)];
        currentCorrectName = correctBird.name;

        let wrongOptions = [];
        const possibleWrongBirds = currentFilteredBirds.filter(bird => bird.name !== currentCorrectName);
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

        birdImage.alt = `Immagine di ${currentCorrectName}`;
        birdImage.onload = null; birdImage.onerror = null;
        birdImage.onload = () => {
            console.log("Immagine caricata (static):", correctBird.image_path);
            birdImage.style.display = 'block';
            createOptionButtons(options);
            setLoadingState(false);
            birdImage.onerror = null;
        };
        birdImage.onerror = () => {
            console.error("Errore caricamento immagine (static):", correctBird.image_path);
            feedbackPara.textContent = "Errore caricamento immagine.";
            feedbackPara.className = 'feedback-error';
            birdImage.style.display = 'none';
            setLoadingState(false);
            nextButton.style.display = 'block'; nextButton.disabled = false;
        };
        birdImage.src = correctBird.image_path;
    }


    /** 5. Crea i bottoni delle opzioni (QUIZ) (Unchanged) */
    function createOptionButtons(options) {
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

    /** 6. Gestisce il click su un bottone-opzione (QUIZ) (Unchanged) */
    function handleChoiceClick(event) {
        if (isLoading) return;
        const chosenButton = event.target;
        const chosenAnswer = chosenButton.textContent;
        optionsContainer.querySelectorAll('button').forEach(button => button.disabled = true);
        const isCorrect = normalizeText(chosenAnswer) === normalizeText(currentCorrectName);

        feedbackPara.textContent = '';
        if (isCorrect) {
            feedbackPara.className = 'feedback-correct';
            chosenButton.classList.add('correct');
        } else {
            feedbackPara.className = 'feedback-incorrect';
            chosenButton.classList.add('incorrect');
            correctAnswerPara.textContent = `Risposta corretta: ${currentCorrectName}`;
            correctAnswerPara.style.display = 'block';
            optionsContainer.querySelectorAll('button').forEach(button => {
                 if (normalizeText(button.textContent) === normalizeText(currentCorrectName)) {
                     button.classList.add('correct');
                 }
            });
        }
        nextButton.style.display = 'block'; nextButton.disabled = false;
        nextButton.focus();
    }

    /** 7. NUOVA Funzione: Mostra gli uccelli per la vetrina selezionata nella GALLERIA */
    function displayGalleryForVetrina(vetrinaName) {
        console.log(`Visualizzazione galleria per: ${vetrinaName}`);
        setLoadingState(true);
        galleryContentContainer.innerHTML = ''; // Pulisci contenuto precedente

        const birdsInVetrina = allBirdsData.filter(bird => bird.vetrina === vetrinaName);

        if (birdsInVetrina.length === 0) {
            galleryContentContainer.innerHTML = `<p>Nessun uccello trovato per ${vetrinaName}.</p>`;
        } else {
            birdsInVetrina.forEach(bird => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('gallery-item');

                const img = document.createElement('img');
                img.src = bird.image_path;
                img.alt = bird.name;
                // Add error handling for gallery images too
                img.onerror = () => {
                    console.error("Errore caricamento immagine galleria:", bird.image_path);
                    itemDiv.innerHTML = `<p>${bird.name}</p><p class="feedback-error">(Immagine non caricata)</p>`; // Show name even if image fails
                };

                const namePara = document.createElement('p');
                namePara.textContent = bird.name;

                itemDiv.appendChild(img);
                itemDiv.appendChild(namePara);
                galleryContentContainer.appendChild(itemDiv);
            });
        }
        setLoadingState(false);
        // Scroll gallery content into view if needed
        galleryContentContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /** 8. NUOVA Funzione: Gestisce il cambio modalità */
    function handleModeSwitch() {
        if (isLoading) return;

        appMode = (appMode === 'quiz') ? 'gallery' : 'quiz';
        console.log(`Cambiando modalità a: ${appMode}`);

        updateUIVisibility();
        resetUIState(); // Clear selections/content when switching modes
    }

    /** 9. NUOVA Funzione: Aggiorna visibilità UI in base alla modalità */
    function updateUIVisibility() {
         // Find the icon span inside the button
         const iconSpan = modeSwitchButton ? modeSwitchButton.querySelector('span.material-symbols-outlined') : null;

         if (appMode === 'quiz') {
            bodyElement.classList.remove('gallery-mode');
            bodyElement.classList.add('quiz-mode');
            // Set icon to show "Go to Gallery" action
            if (iconSpan) iconSpan.textContent = 'photo_library';
            if (modeSwitchButton) modeSwitchButton.title = 'Vai alla Galleria'; // Update tooltip
            // Flashcard visibility is controlled by handleStartExercise/validateVetrinaSelectionQuiz
         } else { // gallery mode
            bodyElement.classList.remove('quiz-mode');
            bodyElement.classList.add('gallery-mode');
            // Set icon to show "Go to Quiz" action
            if (iconSpan) iconSpan.textContent = 'quiz'; // Use 'quiz' icon
            if (modeSwitchButton) modeSwitchButton.title = 'Vai al Quiz'; // Update tooltip
            flashcardContainer.style.display = 'none'; // Ensure flashcard is hidden
         }
         // Ensure loading indicator is off if not loading
         // Check isLoading state before calling setLoadingState to avoid potential loops if called from within it
         if (!isLoading) {
            setLoadingState(false); // Ensure controls are enabled/disabled correctly based on current state
         }
    }

     /** 10. NUOVA Funzione: Resetta stato UI quando si cambia modalità */
     function resetUIState() {
         // Reset quiz state
         // Add null check for vetrinaGridQuiz
         if (vetrinaGridQuiz) vetrinaGridQuiz.querySelectorAll('.vetrina-item.selected').forEach(item => item.classList.remove('selected'));
         currentVetrinaSelectionQuiz = [];
         // Add null check for flashcardContainer
         if (flashcardContainer) flashcardContainer.style.display = 'none';
         // Add null checks for feedback elements
         if (feedbackPara) feedbackPara.textContent = '';
         if (correctAnswerPara) correctAnswerPara.style.display = 'none';
         // Add null check for optionsContainer
         if (optionsContainer) optionsContainer.innerHTML = '';
         // Add null check for birdImage
         if (birdImage) birdImage.src = '';
         validateVetrinaSelectionQuiz(); // Update quiz button state

         // Reset gallery state
         // Add null check for vetrinaGridGallery
         if (vetrinaGridGallery) vetrinaGridGallery.querySelectorAll('.vetrina-item.active').forEach(item => item.classList.remove('active'));
         // Add null check for galleryContentContainer
         if (galleryContentContainer) galleryContentContainer.innerHTML = ''; // Clear gallery content
     }


    // --- Event Listeners ---
    // Add null checks before adding listeners
    if (startExerciseButton) startExerciseButton.addEventListener('click', handleStartExercise);
    if (nextButton) nextButton.addEventListener('click', displayNewCard);
    if (modeSwitchButton) modeSwitchButton.addEventListener('click', handleModeSwitch);

    // --- Inizializzazione ---
    loadAppData(); // Carica i dati e renderizza le griglie

}); // Fine DOMContentLoaded