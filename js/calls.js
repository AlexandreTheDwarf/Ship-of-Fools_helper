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

    if (item.type) html += `<p>Types : ${item.type}</p>`;
    if (item.damage !== undefined) html += `<p>Dommage : ${item.damage}</p>`;
    if (item.magazine_size !== undefined) html += `<p>Taille du chargeur : ${item.magazine_size}</p>`;

    if (item.effects && item.effects.length > 0) {
        html += `<p>Effets : ${item.effects.join(', ')}</p>`;
    } else if (item.effects && item.effects.length === 0) {
        html += `<p>Effets : Aucun</p>`;
    }

    if (item.description) html += `<p>${item.description}</p>`;
    if (item.unlock) html += `<p>Débloquer : ${item.unlock}</p>`;
    if (item.rarity) html += `<p>Rareté : ${item.rarity}</p>`;
    if (item.selling_price !== undefined) html += `<p>Prix de vente : ${item.selling_price}</p>`;

    if (item.availabilities && item.availabilities.length > 0) {
        html += `<p>Disponibilités : ${item.availabilities.join(', ')}</p>`;
    } else if (item.availabilities && item.availabilities.length === 0) {
        html += `<p>Disponibilités : Partout</p>`;
    }

    return html;
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
        data.sort((a, b) => a.id.localeCompare(b.id));

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