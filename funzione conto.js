function countStates(dataset) {
    const stateCounts = {};

    // Itera attraverso i link e conta i target
    dataset.links.forEach(link => {
        const state = link.target; // `target` rappresenta lo stato
        if (state) {
            stateCounts[state] = (stateCounts[state] || 0) + 1;
        }
    });

    // Converte l'oggetto in un array di oggetti per una lettura più chiara
    const result = Object.entries(stateCounts).map(([state, count]) => ({ state, count }));

    // Ordina il risultato per frequenza decrescente
    result.sort((a, b) => b.count - a.count);

    console.log("Conteggio stati:", result);
    return result;
}

// Caricamento del dataset JSON
fetch("Dataset.json")
    .then(response => response.json())
    .then(data => {
        countStates(data);
    })
    .catch(error => console.error("Errore nel caricamento del dataset:", error));
