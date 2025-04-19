import os
import re
import json

print("--- Avvio Script Build Dati Statici ---")

# --- Configurazione ---
IMAGE_BASE_FOLDER = 'img'  # Cartella contenente le VETRINE
OUTPUT_JSON_FILE = 'data.json' # Nome del file JSON di output
# Percorso alla cartella 'img' relativa allo script
IMG_ROOT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), IMAGE_BASE_FOLDER)
# --- Fine Configurazione ---

def clean_bird_name_for_build(filename):
    """ Pulisce il nome file per JSON (rimuove estensione, suffissi base). """
    # Rimuove estensione .png, .jpg, .jpeg (case-insensitive)
    name = re.sub(r'\.(png|jpg|jpeg)$', '', filename, flags=re.IGNORECASE)
    # Rimuove suffissi comuni come _1, _2, F, M, (m e f), (me f) alla fine
    name = re.sub(r'[_ ]?([1-9]|F|M|\(m ?e ?f\))$', '', name, flags=re.IGNORECASE).strip()
    # Sostituisce punti o underscore con spazi
    name = name.replace('.', ' ').replace('_', ' ')
    # Rimuove spazi multipli
    name = re.sub(r'\s+', ' ', name).strip()
    # NOTA: Non usiamo unidecode qui per semplicità, il JS farà solo lower/trim
    return name

def scan_and_build_data():
    """ Scansiona le cartelle e crea la struttura dati per il JSON. """
    all_birds_data = []
    vetrine_found = set()
    print(f"Scansione cartella: {IMG_ROOT_PATH}")

    if not os.path.isdir(IMG_ROOT_PATH):
        print(f"[ERRORE] Cartella '{IMAGE_BASE_FOLDER}' non trovata!")
        return None # Indica errore

    # Itera sulle sottocartelle della cartella 'img'
    for item_name in os.listdir(IMG_ROOT_PATH):
        item_path = os.path.join(IMG_ROOT_PATH, item_name)
        # Processa solo le directory che iniziano con 'VETRINA'
        if item_name.upper().startswith('VETRINA') and os.path.isdir(item_path):
            vetrina_name = item_name # Nome completo della vetrina (es. "VETRINA 1a")
            vetrine_found.add(vetrina_name)
            print(f"  Trovata Vetrina: {vetrina_name}")

            image_count = 0
            # Itera sui file dentro la cartella della vetrina
            for filename in os.listdir(item_path):
                # Controlla se è un'immagine valida (ignora screenshot e file nascosti)
                if not filename.startswith('.') and \
                   filename.lower().endswith(('.png', '.jpg', '.jpeg')) and \
                   not filename.lower().startswith('screenshot'):

                    image_count += 1
                    # Pulisci il nome dell'uccello da usare nell'app
                    cleaned_name = clean_bird_name_for_build(filename)
                    # Costruisci il percorso relativo all'immagine che userà il JS/HTML
                    # Assumiamo che 'img' sarà una cartella allo stesso livello di index.html
                    relative_image_path = f"{IMAGE_BASE_FOLDER}/{vetrina_name}/{filename}".replace('\\', '/')

                    # Aggiungi i dati dell'uccello alla lista
                    all_birds_data.append({
                        "name": cleaned_name,           # Nome pulito
                        "image_path": relative_image_path, # Percorso relativo per l'HTML/JS
                        "vetrina": vetrina_name         # Nome completo della vetrina per il filtro
                    })
            print(f"    -> Trovati {image_count} file immagine validi.")

    if not all_birds_data:
        print("[ATTENZIONE] Nessun file immagine valido trovato.")
        return None

    # Ordina le vetrine alfabeticamente
    ordered_vetrine = sorted(list(vetrine_found))

    # Crea la struttura dati finale
    final_data = {
        "vetrine": ordered_vetrine,
        "birds": all_birds_data
    }

    print(f"\nVetrine trovate: {len(ordered_vetrine)}")
    print(f"Totale uccelli trovati: {len(all_birds_data)}")
    return final_data

def write_json_data(data, filename):
    """ Scrive i dati nel file JSON specificato. """
    if data is None:
        print("[ERRORE] Nessun dato da scrivere nel file JSON.")
        return False
    try:
        # Usa ensure_ascii=False per gestire correttamente eventuali caratteri speciali nei nomi
        # Usa indent=2 o indent=4 per rendere il file leggibile (pretty-print)
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[SUCCESS] Dati scritti correttamente nel file: {filename}")
        return True
    except Exception as e:
        print(f"[ERRORE] Impossibile scrivere nel file JSON '{filename}': {e}")
        return False

# --- Esecuzione dello Script ---
if __name__ == "__main__":
    built_data = scan_and_build_data()
    if built_data:
        write_json_data(built_data, OUTPUT_JSON_FILE)
    print("--- Script Build Dati Statici Terminato ---")