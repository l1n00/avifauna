document.addEventListener('DOMContentLoaded', () => {
    // --- Selezione Elementi DOM ---
    const birdImage = document.getElementById('bird-image');
    const optionsContainer = document.getElementById('multiple-choice-options');
    const nextButton = document.getElementById('next-card');
    const feedbackPara = document.getElementById('feedback');
    const correctAnswerPara = document.getElementById('correct-answer');
    const loadingIndicator = document.getElementById('loading');
    const flashcardContainer = document.getElementById('flashcard');
    const vetrinaGridContainer = document.getElementById('vetrina-grid');
    const startExerciseButton = document.getElementById('start-exercise-button');
    const selectionFeedback = document.getElementById('selection-feedback');

    // --- Stato Applicazione Globale ---
    let isLoading = false; // Flag per operazioni in corso
    let allBirdsData = []; // Conterrà tutti i dati degli uccelli da data.json
    let allVetrine = [];   // Conterrà la lista delle vetrine da data.json
    let currentCorrectName = ''; // Nome corretto dell'uccello nella card attuale
    let currentFilteredBirds = []; // Lista uccelli filtrata per la sessione corrente
    let currentVetrinaSelection = []; // Vetrine selezionate dall'utente

    // --- Funzioni Helper ---

    /** Mostra/Nasconde indicatore e disabilita/abilita controlli base */
    function setLoadingState(loading) {
        isLoading = loading;
        if (loadingIndicator) {
            loadingIndicator.style.display = loading ? 'block' : 'none';
        }
        nextButton.disabled = loading;
        startExerciseButton.disabled = loading;
        optionsContainer.querySelectorAll('button').forEach(button => button.disabled = loading);
        // Disabilita interazione con le card vetrina durante caricamento card/dati
        vetrinaGridContainer.querySelectorAll('.vetrina-item').forEach(item => {
             item.style.pointerEvents = loading ? 'none' : 'auto';
             item.style.opacity = loading ? '0.7' : '1';
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
        setLoadingState(true); // Mostra caricamento iniziale
        try {
            // Assumiamo che data.json sia allo stesso livello o percorso accessibile
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`Errore HTTP ${response.status}: Impossibile caricare data.json`);
            }
            const data = await response.json();

            if (!data || !data.vetrine || !data.birds) {
                throw new Error("Formato data.json non valido.");
            }

            allVetrine = data.vetrine;
            allBirdsData = data.birds;
            console.log(`Dati caricati: ${allVetrine.length} vetrine, ${allBirdsData.length} uccelli.`);

            renderVetrinaGrid(); // Popola la griglia delle vetrine

        } catch (error) {
            console.error("Errore caricamento/parsing data.json:", error);
            vetrinaGridContainer.innerHTML = `<p class="feedback-error">Errore fatale: Impossibile caricare i dati dell'applicazione. ${error.message}</p>`;
            startExerciseButton.disabled = true; // Disabilita tutto se i dati non caricano
        } finally {
            setLoadingState(false); // Nascondi caricamento iniziale
        }
    }

    /** 2. Crea la griglia di vetrine cliccabili (usa allVetrine) */
    function renderVetrinaGrid() {
        vetrinaGridContainer.innerHTML = ''; // Pulisce
        if (allVetrine.length === 0) {
            vetrinaGridContainer.innerHTML = `<p>Nessuna vetrina disponibile.</p>`;
            startExerciseButton.disabled = true;
            return;
        }
        allVetrine.forEach(vetrinaName => { // Usa la variabile globale
            const card = document.createElement('div');
            card.classList.add('vetrina-item');
            const displayName = vetrinaName.replace(/^vetrina\s+/i, ''); // Rimuovi "VETRINA "
            card.textContent = displayName;
            card.dataset.vetrina = vetrinaName; // Memorizza nome completo
            card.classList.add('selected');     // Seleziona di default

            card.addEventListener('click', () => {
                card.classList.toggle('selected');
                validateVetrinaSelection();
            });
            vetrinaGridContainer.appendChild(card);
        });
        startExerciseButton.disabled = false; // Abilita bottone
        validateVetrinaSelection(); // Controlla stato iniziale
    }

    /** Funzione helper per validare la selezione delle vetrine */
    function validateVetrinaSelection() {
        const selectedItems = vetrinaGridContainer.querySelectorAll('.vetrina-item.selected');
         currentVetrinaSelection = Array.from(selectedItems).map(item => item.dataset.vetrina); // Aggiorna selezione globale

        if (currentVetrinaSelection.length === 0) {
             selectionFeedback.style.display = 'block';
             startExerciseButton.disabled = true;
             flashcardContainer.style.display = 'none'; // Nascondi flashcard se deselezionano tutto
             return false;
         } else {
             selectionFeedback.style.display = 'none';
             startExerciseButton.disabled = isLoading;
             return true;
         }
    }

    /** 3. Gestisce il click su "Avvia / Aggiorna Esercizio" */
    function handleStartExercise() {
        // La validazione ora aggiorna anche currentVetrinaSelection
        if (!validateVetrinaSelection()) return;

        console.log("Avvio/Aggiornamento esercizio con vetrine:", currentVetrinaSelection);

        // Filtra gli uccelli UNA VOLTA per questa sessione di esercizio
        currentFilteredBirds = allBirdsData.filter(bird =>
            currentVetrinaSelection.includes(bird.vetrina)
        );
        console.log(`Filtrati ${currentFilteredBirds.length} uccelli per l'esercizio.`);

        if (currentFilteredBirds.length === 0) {
             feedbackPara.textContent = "Nessun uccello trovato per le vetrine selezionate.";
             feedbackPara.className = 'feedback-error';
             flashcardContainer.style.display = 'flex'; // Mostra flashcard ma con errore
             optionsContainer.innerHTML = ''; // Pulisci opzioni
             birdImage.style.display = 'none'; // Nascondi immagine
             nextButton.style.display = 'none'; // Nascondi prossima
             return;
        }

        flashcardContainer.style.display = 'flex'; // Mostra contenitore
        displayNewCard(); // Mostra la prima card filtrata
    }

    /** 4. NUOVA Funzione: Mostra una nuova card (logica ex-backend) */
    function displayNewCard() {
        if (isLoading) return; // Evita se già in corso
        if (currentFilteredBirds.length === 0) {
             console.error("displayNewCard chiamata ma non ci sono uccelli filtrati.");
             feedbackPara.textContent = "Errore: nessun uccello disponibile per le vetrine selezionate.";
             feedbackPara.className = 'feedback-error';
             optionsContainer.innerHTML = ''; birdImage.style.display = 'none'; nextButton.style.display = 'none';
             return;
        }

        setLoadingState(true); // Simula caricamento per feedback visivo

        // Reset UI parziale (diverso da fetchNewCard)
        feedbackPara.textContent = ''; feedbackPara.className = '';
        correctAnswerPara.style.display = 'none'; correctAnswerPara.textContent = '';
        optionsContainer.innerHTML = '';
        nextButton.style.display = 'none';
        birdImage.style.display = 'none'; birdImage.src = '';

        // 1. Scegli l'uccello corretto dalla lista GIA' filtrata
        const correctBird = currentFilteredBirds[Math.floor(Math.random() * currentFilteredBirds.length)];
        currentCorrectName = correctBird.name; // Imposta nome corretto globale

        // 2. Genera opzioni sbagliate dalla lista filtrata
        let wrongOptions = [];
        // Uccelli possibili per opzioni sbagliate (diversi da quello corretto)
        const possibleWrongBirds = currentFilteredBirds.filter(bird => bird.name !== currentCorrectName);
        // Quante opzioni sbagliate prendere (massimo 2, ma anche meno se non ce ne sono)
        const numWrongToSample = Math.min(2, possibleWrongBirds.length);

        if (numWrongToSample > 0) {
            // Estrai nomi unici per le opzioni sbagliate
            let sampledNames = new Set();
            while(sampledNames.size < numWrongToSample && sampledNames.size < possibleWrongBirds.length) {
                 let potentialWrong = possibleWrongBirds[Math.floor(Math.random() * possibleWrongBirds.length)];
                 sampledNames.add(potentialWrong.name);
            }
            wrongOptions = Array.from(sampledNames);
        }

        // 3. Combina e mescola le opzioni
        let options = [currentCorrectName, ...wrongOptions];
        options = shuffleArray(options); // Mescola l'array

        console.log(`Mostrando card: Corretto='${currentCorrectName}', Opzioni=${options}`);

        // 4. Aggiorna UI
        birdImage.alt = `Immagine di ${currentCorrectName}`;

        // Gestione caricamento/errore immagine
        birdImage.onload = null; birdImage.onerror = null; // Pulisci handlers
        birdImage.onload = () => {
            console.log("Immagine caricata (static):", correctBird.image_path);
            birdImage.style.display = 'block';
            createOptionButtons(options); // Crea bottoni opzioni
            setLoadingState(false); // Fine caricamento
            birdImage.onerror = null;
        };
        birdImage.onerror = () => {
            console.error("Errore caricamento immagine (static):", correctBird.image_path);
            feedbackPara.textContent = "Errore caricamento immagine.";
            feedbackPara.className = 'feedback-error';
            birdImage.style.display = 'none';
            setLoadingState(false);
            nextButton.style.display = 'block'; nextButton.disabled = false; // Permetti di andare avanti
        };
        // Imposta src con il percorso relativo dal JSON
        birdImage.src = correctBird.image_path;

    } // --- Fine displayNewCard ---


    /** 5. Crea i bottoni delle opzioni (invariata) */
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

    /** 6. Gestisce il click su un bottone-opzione (invariata) */
    function handleChoiceClick(event) {
        if (isLoading) return;
        const chosenButton = event.target;
        const chosenAnswer = chosenButton.textContent;
        optionsContainer.querySelectorAll('button').forEach(button => button.disabled = true);
        const isCorrect = normalizeText(chosenAnswer) === normalizeText(currentCorrectName);

        feedbackPara.textContent = ''; // No testo "Corretto/Sbagliato"
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

    // --- Event Listeners ---
    startExerciseButton.addEventListener('click', handleStartExercise);
    // MODIFICA: Next ora chiama displayNewCard
    nextButton.addEventListener('click', displayNewCard);

    // --- Inizializzazione ---
    loadAppData(); // Carica i dati da data.json all'avvio

}); // Fine DOMContentLoaded