# Flashcard Uccelli - Preparazione Esame Venatorio

Questo progetto è una semplice applicazione web statica creata per aiutare nello studio e nel riconoscimento dell'avifauna richiesta per l'esame venatorio, basandosi su immagini organizzate per "vetrine".


## Funzionalità

* **Flashcard Visive:** Mostra immagini di uccelli per l'identificazione.
* **Quiz a Scelta Multipla:** Presenta 3 opzioni di nome per ogni uccello.
* **Selezione Vetrine:** Permette di filtrare gli uccelli selezionando una o più "vetrine" (categorie) su cui esercitarsi tramite una griglia interattiva.
* **Feedback Immediato:** Evidenzia visivamente la risposta scelta come corretta o sbagliata e mostra la risposta corretta in caso di errore.
* **Interfaccia Responsive:** Si adatta a diverse dimensioni di schermo (desktop, tablet, mobile).
* **Sito Statico:** Non richiede un backend attivo per funzionare, può essere ospitato gratuitamente su piattaforme come GitHub Pages, Netlify, Vercel, ecc.

## Tecnologie Utilizzate

* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **Build Script (Locale):** Python 3 (per generare il file `data.json` dalle immagini)
* **Hosting:** Progettato per GitHub Pages o simili servizi di hosting statico.

## Struttura del Progetto

/
├── index.html         # Pagina HTML principale dell'applicazione
├── data.json          # File JSON contenente i dati delle vetrine e degli uccelli (generato)
├── static/
│   ├── css/style.css  # Fogli di stile per l'aspetto grafico
│   └── js/script.js   # Logica JavaScript del frontend (caricamento dati, interazione)
├── img/               # Cartella contenente le immagini degli uccelli
│   ├── VETRINA 1a/    # Sottocartelle per ogni vetrina...
│   ├── VETRINA 1b/
│   └── ...
├── .gitignore         # File per specificare cosa ignorare da Git
└── README.md          # Questo file di descrizione



_Realizzato per lo studio dell'avifauna._