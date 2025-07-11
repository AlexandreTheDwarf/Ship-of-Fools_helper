// Définition des URLs des fichiers JSON
const urls = {
    projectiles: './json/projectiles.json',
    artifacts: './json/artifacts.json',
    trinkets: './json/trinkets.json'
};

// Récupération des éléments du DOM une seule fois
const itemsDiv = document.getElementById('items');
const descriptionDiv = document.getElementById('description'); // On garde cette div pour la description au survol
const modal = document.getElementById('modal');
const modalContent = document.getElementById('content');
const closeButton = document.getElementById('close');

/**
 * Fonction pour générer le contenu HTML détaillé d'un item.
 * Cette fonction sera utilisée pour la description au survol et pour la modale.
 * @param {object} item - L'objet item du JSON.
 * @param {boolean} includeTitle - Indique si le titre (h2) doit être inclus.
 * @returns {string} Le HTML formaté avec toutes les informations de l'item.
 */
function generateItemDetailsHtml(item, includeTitle = false) {
    let html = ``;

    if (includeTitle) {
        html += `<h2>${item.name}</h2>`; // Ajoute le titre si demandé
    }

    if (item.type) html += `<p>Type : ${item.type}</p>`;
    if (item.damage !== undefined) html += `<p>Dommage : ${item.damage}</p>`;
    if (item.magazine_size !== undefined) html += `<p>Taille du chargeur : ${item.magazine_size}</p>`;

    if (item.effects && item.effects.length > 0) {
        html += `<p>Effet(s) : ${item.effects.join(', ')}</p>`;
    } else if (item.effects && item.effects.length === 0) {
        html += `<p>Effet(s) : Aucun</p>`;
    }

    if (item.increased_effect) {
        html += `<p><strong>Effet aggravé :</strong> ${item.increased_effect}</p>`;
    }

    if (item.description) html += `<p>${item.description}</p>`;
    if (item.unlock) html += `<p>Débloquer : ${item.unlock}</p>`;
    if (item.rarity) html += `<p>Rareté : ${item.rarity}</p>`;
    if (item.selling_price !== undefined) {
        html += `<p>Prix de vente : ${replacePriceIcons(item.selling_price.toString())}</p>`;
    }

    if (item.availabilities && item.availabilities.length > 0) {
        html += `<p>Disponibilités : ${item.availabilities.join(', ')}</p>`;
    } else if (item.availabilities && item.availabilities.length === 0) {
        html += `<p>Disponibilités : Partout</p>`;
    }

    return html;
}

// Fonction utilitaire pour remplacer le texte par des images dans le prix de vente
function replacePriceIcons(text) {
    // Remplace "Sand Dollar.png" par l'image correspondante
    text = text.replace(/(\d*)\s*Sand Dollar\.png/g, (match, qty) => {
        const n = qty ? qty : 1;
        return `${n > 1 ? n : ''}<img src="./assets/50px-Sand_Dollar.webp" alt="Sand Dollar" class="inline-icon">`;
    });
    // Remplace "Plank.png" par l'image correspondante
    text = text.replace(/(\d*)\s*Plank\.png/g, (match, qty) => {
        const n = qty ? qty : 1;
        return `${n > 1 ? n : ''}<img src="./assets/50px-Plank.webp" alt="Plank" class="inline-icon">`;
    });
    return text;
}

/**
 * Fonction générique pour charger et afficher les éléments.
 * @param {string} url - L'URL du fichier JSON à charger.
 */
async function loadAndDisplayItems(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erreur réseau: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        // Tri ascendant par rapport à l'id (adapté pour les IDs de chaîne)
        data.sort((a, b) => {
            // D'abord, on compare les types
            const typeA = a.type ? a.type.toLowerCase() : '';
            const typeB = b.type ? b.type.toLowerCase() : '';
            if (typeA < typeB) return -1;
            if (typeA > typeB) return 1;
            // Si les types sont identiques, on compare les noms
            const nameA = a.name ? a.name.toLowerCase() : '';
            const nameB = b.name ? b.name.toLowerCase() : '';
            return nameA.localeCompare(nameB);
        });

        // Nettoyer les conteneurs existants
        itemsDiv.innerHTML = '';
        descriptionDiv.innerHTML = ''; // Toujours vider la div de description au changement de catégorie

        data.forEach(item => {
            // Créer et configurer l'image de l'élément
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.name;
            img.classList.add('itemImg');

            // Créer et configurer la div de description pour le survol
            const descDiv = document.createElement('div');
            descDiv.className = 'description';
            // Utilisation de la nouvelle fonction avec includeTitle = true pour la description au survol
            descDiv.innerHTML = generateItemDetailsHtml(item, true);
            descDiv.style.display = 'none'; // Cacher par défaut

            // Ajouter les éléments au DOM
            itemsDiv.appendChild(img);
            descriptionDiv.appendChild(descDiv); // Ajouter la div de description au conteneur 'description'

            // Gérer les événements mouseover et mouseout pour la description au survol
            img.addEventListener('mouseover', () => {
                descDiv.style.display = 'block';
            });

            img.addEventListener('mouseout', () => {
                descDiv.style.display = 'none';
            });

            // Gérer l'événement click pour ouvrir la modale avec toutes les données
            img.addEventListener('click', () => {
                modal.style.display = 'block';
                modalContent.innerHTML = `
                    <div id="modal-title">
                        <img id="modal-img" class="resize-image" src="${item.image}" alt="${item.name}">
                        <h2>${item.name}</h2> </div>
                    <div id="modal-text">
                        ${generateItemDetailsHtml(item, false)} </div>`;
            });
        });
    } catch (error) {
        console.error('Erreur lors du chargement ou de l\'affichage des éléments:', error);
    }
}

// Ajout des écouteurs d'événements pour les boutons de navigation
document.getElementById('projectiles').addEventListener('click', () => loadAndDisplayItems(urls.projectiles));
document.getElementById('artifacts').addEventListener('click', () => loadAndDisplayItems(urls.artifacts));
document.getElementById('trinkets').addEventListener('click', () => loadAndDisplayItems(urls.trinkets));

// Écouteur d'événement pour fermer la modale
closeButton.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Fermer la modale si l'utilisateur clique en dehors de son contenu
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Charger des éléments par défaut au chargement de la page
// Supprimé : document.addEventListener('DOMContentLoaded', () => { loadAndDisplayItems(urls.projectiles); });
// La div 'items' sera vide jusqu'à un clic sur un bouton.