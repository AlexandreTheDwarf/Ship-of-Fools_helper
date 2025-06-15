import requests
from bs4 import BeautifulSoup
import json
import re # Pour les expressions régulières

def scrape_projectile_data_from_p_tag(url):
    """
    Récupère les données d'un projectile depuis une URL, en supposant que les données
    sont dans un paragraphe <p> avec des balises <br> pour séparer les champs.

    Args:
        url (str): L'URL de la page du projectile (ex: "https://shipoffools.wiki.gg/wiki/Seashell").

    Returns:
        dict: Un dictionnaire contenant les données du projectile, ou None si échec.
    """
    projectile_data = {}
    base_wiki_url = "https://shipoffools.wiki.gg"

    try:
        response = requests.get(url)
        response.raise_for_status() # Lève une exception pour les codes d'état HTTP erronés
    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de la requête HTTP pour {url}: {e}")
        return None

    soup = BeautifulSoup(response.text, 'html.parser')

    # Chercher la balise <p> qui contient toutes les données.
    # Sur l'exemple Seashell, c'est la première balise <p> dans le contenu principal.
    content_div = soup.find('div', class_='mw-parser-output')
    if not content_div:
        print(f"Contenu principal du wiki introuvable pour {url}.")
        return None

    # On cherche le premier paragraphe direct dans le mw-parser-output
    # qui ne contient pas d'infobox ou d'autres éléments complexes.
    p_tag = None
    for p in content_div.find_all('p', recursive=False): # recursive=False pour chercher seulement les enfants directs
        # Vérifier si ce paragraphe contient les balises <br> caractéristiques
        # et si ce n'est pas juste un paragraphe de texte introductif sans données structurées.
        # Il devrait aussi contenir des "Damage", "Magazine Size", etc.
        if "Damage" in p.get_text() and "Magazine Size" in p.get_text():
            p_tag = p
            break
    
    if not p_tag:
        print(f"Balise <p> de données non trouvée pour {url}.")
        return None

    # Extraire le nom de l'item (du titre de la page)
    page_title_tag = soup.find('h1', class_='page-header__title')
    projectile_data['name'] = page_title_tag.get_text(strip=True) if page_title_tag else url.split('/')[-1].replace('_', ' ')
    projectile_data['id'] = projectile_data['name'].lower().replace(' ', '-') # Générer un ID propre

    # Extraire l'image du projectile
    # L'image est un <a> avec une <img> à l'intérieur, directement dans le <p>
    img_tag_wrapper = p_tag.find('a', class_='image')
    if img_tag_wrapper:
        img_tag = img_tag_wrapper.find('img')
        if img_tag and img_tag.get('src'):
            img_src = img_tag['src']
            # L'URL d'image sur wiki.gg est relative et ne contient pas /thumb/
            # Ex: /images/e/eb/Seashell.png
            if not img_src.startswith('http'):
                projectile_data['image'] = base_wiki_url + img_src
            else:
                projectile_data['image'] = img_src
    else:
        projectile_data['image'] = None


    # Obtenir le texte brut de la balise <p> et le diviser par les balises <br>
    # Pour chaque enfant de p_tag, s'il est une chaîne, on l'ajoute.
    # S'il est une balise <br>, on considère que c'est une nouvelle ligne.
    raw_lines = []
    for content in p_tag.contents:
        if isinstance(content, str):
            raw_lines.append(content.strip())
        elif content.name == 'br':
            raw_lines.append('<br>') # Marqueur pour une nouvelle ligne
    
    # Nettoyer les lignes vides ou celles qui ne sont pas des données
    parsed_lines = [line for line in raw_lines if line and line != '<br>']

    # Parser chaque ligne clé: valeur
    for line in parsed_lines:
        if ':' in line:
            key_raw, value_raw = line.split(':', 1)
            key = key_raw.strip().replace(' ', '_').lower() # Normaliser la clé
            value = value_raw.strip()

            # Nettoyage et conversion des valeurs
            if key == 'damage' or key == 'magazine_size':
                match = re.search(r'(\d+)', value)
                projectile_data[key] = int(match.group(1)) if match else 0
            elif key == 'effects':
                # Si l'effet est juste un "-", le considérer comme vide
                projectile_data[key] = [] if value == '-' else [e.strip() for e in value.split(',') if e.strip()]
            elif key == 'selling_price':
                match = re.search(r'(\d+)', value)
                projectile_data[key] = int(match.group(1)) if match else 0
            elif key == 'availabilities':
                projectile_data[key] = [a.strip() for a in value.split(',') if a.strip()]
            else:
                projectile_data[key] = value
        elif line.startswith('Description'):
            # Gérer la description si elle est sur plusieurs lignes ou sans :
            # Pour l'instant, si c'est la première ligne sans :, on l'assigne à description
            if 'description' not in projectile_data:
                projectile_data['description'] = line.replace('Description :', '').strip()

    # Assurer la présence des clés essentielles avec des valeurs par défaut si non trouvées
    default_values = {
        'damage': 0,
        'magazine_size': 0,
        'effects': [],
        'description': '',
        'unlock': 'Unknown',
        'rarity': 'Unknown',
        'selling_price': 0,
        'availabilities': ['Unknown'],
        'type': 'Unknown' # Le type n'est pas dans cette structure, à définir manuellement ou par une autre méthode
    }
    for key, default_val in default_values.items():
        if key not in projectile_data:
            projectile_data[key] = default_val

    return projectile_data


def scrape_all_projectiles(main_url):
    """
    Scrape la page principale des projectiles pour trouver les liens individuels,
    puis scrape chaque page individuelle.
    """
    all_projectiles = []
    base_wiki_url = "https://shipoffools.wiki.gg"

    try:
        response = requests.get(main_url)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de la requête HTTP principale: {e}")
        return []

    soup = BeautifulSoup(response.text, 'html.parser')

    content_div = soup.find('div', class_='mw-parser-output')
    if not content_div:
        print("Contenu principal du wiki introuvable sur la page principale.")
        return []
    
    # Chercher les liens dans les catégories (h2, h3, etc.) ou directement dans les listes.
    # Les liens sont souvent des <a> avec un attribut title correspondant au nom de l'item.
    
    # Stratégie: Trouver tous les liens dans le contenu principal qui ont un titre
    # et qui pointent vers des pages wiki valides (pas des catégories, fichiers, etc.)
    projectile_links = []
    for link in content_div.find_all('a', href=True):
        href = link['href']
        title = link.get('title')
        link_text = link.get_text(strip=True)

        # Filtrer les liens non pertinents
        if href.startswith('/wiki/') and ':' not in href and not href.endswith(('.png', '.jpg', '.webp', '.gif', '.svg')):
            # S'assurer que le texte du lien correspond au titre (nom du projectile)
            # et que ce n'est pas un lien générique du wiki.
            if title and title == link_text and "Ship of Fools" not in title and "Wiki" not in title and "Category" not in title:
                full_link = base_wiki_url + href
                if full_link not in projectile_links:
                    projectile_links.append(full_link)
    
    print(f"Trouvé {len(projectile_links)} liens de projectiles. Démarrage de l'extraction des détails...")

    for link_idx, projectile_url in enumerate(projectile_links):
        print(f"Progression: {link_idx + 1}/{len(projectile_links)} - Extraction de {projectile_url}")
        
        # Ajoute un petit délai pour être gentil avec le serveur du wiki
        # import time
        # time.sleep(0.1) 

        projectile_data = scrape_projectile_data_from_p_tag(projectile_url)
        if projectile_data:
            all_projectiles.append(projectile_data)
        else:
            print(f"Échec de l'extraction des données pour {projectile_url}. Ignoré.")

    return all_projectiles

if __name__ == "__main__":
    main_projectiles_page_url = "https://shipoffools.wiki.gg/wiki/Projectiles"
    
    print("Début du scraping de la page principale pour les liens...")
    all_projectiles_extracted = scrape_all_projectiles(main_projectiles_page_url)

    if all_projectiles_extracted:
        # Trier par nom pour une meilleure lisibilité
        all_projectiles_sorted = sorted(all_projectiles_extracted, key=lambda x: x.get('name', ''))

        output_filename = "projectiles_data_from_p_tag.json"
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(all_projectiles_sorted, f, indent=4, ensure_ascii=False)
        print(f"\nDonnées des projectiles sauvegardées dans '{output_filename}'.")
        print(f"Nombre de projectiles extraits : {len(all_projectiles_sorted)}")
    else:
        print("Aucune donnée de projectile n'a pu être extraite.")