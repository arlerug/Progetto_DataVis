import json

# 1. Carica il dataset originale
input_file_path = "Dataset.json"  # Sostituisci con il percorso corretto del file JSON
cleaned_file_path = "Cleaned_Dataset.json"  # Nome del file ripulito
final_file_path = "Cleaned_Dataset_for_MapVis.json"  # Nome del file per la visualizzazione

# Leggi il file JSON
with open(input_file_path, 'r') as file:
    dataset = json.load(file)

# 2. Rimuovi i campi inutili
for link in dataset.get("links", []):
    for attr in link.get("attr", []):
        if "athlete" in attr:
            attr["athlete"].pop("name", None)
            attr["athlete"].pop("height", None)
            attr["athlete"].pop("weight", None)
            attr["athlete"].pop("born", None)
        attr.pop("event", None)

# 3. Controlla i tipi dei dati
def validate_data_types(dataset):
    """Verifica i tipi di dati nei nodi e nei collegamenti del dataset."""
    for node in dataset.get("nodes", []):
        if not isinstance(node.get("id"), str):
            raise ValueError(f"Il campo 'id' del nodo non è una stringa: {node}")
        if "name" in node and not isinstance(node.get("name"), str):
            raise ValueError(f"Il campo 'name' del nodo non è una stringa: {node}")
        if "noc" in node and not isinstance(node.get("noc"), str):
            raise ValueError(f"Il campo 'noc' del nodo non è una stringa: {node}")

    for link in dataset.get("links", []):
        if not isinstance(link.get("source"), str):
            raise ValueError(f"Il campo 'source' del link non è una stringa: {link}")
        if not isinstance(link.get("target"), str):
            raise ValueError(f"Il campo 'target' del link non è una stringa: {link}")
        for attr in link.get("attr", []):
            if not isinstance(attr.get("sport"), str):
                raise ValueError(f"Il campo 'sport' dell'attributo non è una stringa: {attr}")

validate_data_types(dataset)

# 4. Controlla i valori nulli
def check_null_values(dataset):
    """Verifica se ci sono valori nulli non previsti nei dati."""
    for node in dataset.get("nodes", []):
        if node.get("id") is None:
            raise ValueError(f"Il campo 'id' del nodo contiene un valore nullo: {node}")
        if "name" in node and node.get("name") is None:
            raise ValueError(f"Il campo 'name' del nodo contiene un valore nullo: {node}")
        if "noc" in node and node.get("noc") is None:
            raise ValueError(f"Il campo 'noc' del nodo contiene un valore nullo: {node}")

    for link in dataset.get("links", []):
        if link.get("source") is None:
            raise ValueError(f"Il campo 'source' del link contiene un valore nullo: {link}")
        if link.get("target") is None:
            raise ValueError(f"Il campo 'target' del link contiene un valore nullo: {link}")
        for attr in link.get("attr", []):
            if attr.get("sport") is None:
                raise ValueError(f"Il campo 'sport' dell'attributo contiene un valore nullo: {attr}")

check_null_values(dataset)

# 5. Estrai gli sport univoci
sports = set()
for link in dataset.get("links", []):
    for attr in link.get("attr", []):
        sport = attr.get("sport")
        if sport:
            sports.add(sport)

sorted_sports = sorted(sports)
print("Sport univoci trovati nel dataset:")
print(sorted_sports)

# 6. Estrai i nodi con solo "name" e "id" (disciplina generica)
simple_nodes = {node["id"]: node["name"] for node in dataset.get("nodes", []) if "noc" not in node}

# 7. Crea una mappatura degli sport alle discipline generiche
sport_to_nodes = {}
for link in dataset.get("links", []):
    for attr in link.get("attr", []):
        sport = attr.get("sport")
        if sport and link["source"] in simple_nodes:
            sport_to_nodes.setdefault(sport, set()).add(simple_nodes[link["source"]])

# Converti la mappatura in una forma leggibile
sport_to_nodes_mapped = {sport: sorted(list(nodes)) for sport, nodes in sport_to_nodes.items()}

# Mostra la mappatura
print("\nMappatura sport -> discipline generiche:")
for sport, disciplines in sport_to_nodes_mapped.items():
    print(f"{sport}: {disciplines}")

# 8. Crea una mappatura semplificata per sostituire gli sport
sport_to_discipline = {sport: disciplines[0] for sport, disciplines in sport_to_nodes_mapped.items() if disciplines}

# 9. Aggiorna e ripulisci il dataset
for link in dataset.get("links", []):
    for attr in link.get("attr", []):
        # Sostituisci lo sport con la disciplina generica
        sport = attr.get("sport")
        if sport in sport_to_discipline:
            attr["sport"] = sport_to_discipline[sport]

# 10. Salva il dataset ripulito
with open(cleaned_file_path, 'w') as cleaned_file:
    json.dump(dataset, cleaned_file, indent=4)

print(f"\nDataset ripulito salvato in {cleaned_file_path}")

# 11. Modifica valori di NOC e ID per il dataset di visualizzazione
with open(cleaned_file_path, 'r') as cleaned_file:
    cleaned_dataset = json.load(cleaned_file)

mapping_changes = {
    "GDR": "GER",
    "FRG": "GER",
    "ROC": "RUS",
    "URS": "RUS",
    "HKG": "CHN"
}

for node in cleaned_dataset.get("nodes", []):
    if node.get("noc") in mapping_changes:
        node["noc"] = mapping_changes[node["noc"]]
    if node.get("id") in mapping_changes:
        node["id"] = mapping_changes[node["id"]]

for link in cleaned_dataset.get("links", []):
    if link.get("source") in mapping_changes:
        link["source"] = mapping_changes[link["source"]]
    if link.get("target") in mapping_changes:
        link["target"] = mapping_changes[link["target"]]

# 12. Salva il dataset finale per la visualizzazione
with open(final_file_path, 'w') as final_file:
    json.dump(cleaned_dataset, final_file, indent=4)

print(f"\nDataset finale salvato in {final_file_path}")
