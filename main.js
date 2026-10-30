/*
  Agora – TP1 : le catalogue des salles.

  Adresse de l'API Agora. Le backend doit tourner sur votre poste (voir README.md).
  Documentation de l'API (Swagger) : http://localhost:8080/docs
*/
const API_URL = "http://localhost:8080/api/agora";

const NB_EQUIPEMENTS_MAX = 3;
const NB_SQUELETTES = 6;

const LIBELLES_EQUIPEMENTS = {
  PMR: "PMR",
  CUISINE: "Cuisine",
  VIDEOPROJECTEUR: "Vidéoprojecteur",
  SCENE: "Scène",
  PARKING: "Parking",
  SONORISATION: "Sonorisation",
  WIFI: "Wifi",
  TERRASSE: "Terrasse",
  JARDIN: "Jardin",
};

const formulaire = document.querySelector(".filtres");
const compteur = document.querySelector("#compteur");
const listeSalles = document.querySelector("#liste-salles");
const etatErreur = document.querySelector("#etat-erreur");
const etatVide = document.querySelector("#etat-vide");
const modeleCarte = document.querySelector("#modele-carte");
const modeleSquelette = document.querySelector("#modele-squelette");

let toutesLesSalles = [];
let totalSalles = 0;


/* ---------- Appel à l'API ---------- */

async function recupererSalles() {
  const reponse = await fetch(`${API_URL}/salles`);

  if (!reponse.ok) {
    throw new Error(`Erreur ${reponse.status}`);
  }

  return reponse.json();
}


/* ---------- Construction des cartes ---------- */

function libelleEquipement(code) {
  return LIBELLES_EQUIPEMENTS[code] ?? code;
}

function creerCarteSalle(salle) {
  const carte = modeleCarte.content.cloneNode(true);
  const champ = (nom) => carte.querySelector(`[data-champ="${nom}"]`);

  champ("nom").textContent = salle.nom;
  champ("quartier").textContent = salle.quartier;
  champ("capacite").textContent = `${salle.capacite} personnes`;
  champ("tarif").textContent = `${salle.tarifHoraire} €/h hors Montvert`;

  const equipements = salle.equipements.slice(0, NB_EQUIPEMENTS_MAX).map((code) => {
    const etiquette = document.createElement("li");
    etiquette.className = "etiquette";
    etiquette.textContent = libelleEquipement(code);
    return etiquette;
  });
  champ("equipements").replaceChildren(...equipements);

  champ("lien").href = `/salles/${salle.id}`;
  champ("precision").textContent = ` : ${salle.nom}`;

  return carte;
}

function creerCarteSquelette() {
  return modeleSquelette.content.cloneNode(true);
}


/* ---------- Les états de l'écran ---------- */

function afficherChargement() {
  etatErreur.hidden = true;
  etatVide.hidden = true;
  listeSalles.setAttribute("aria-busy", "true");
  compteur.textContent = "Chargement des salles…";

  const squelettes = Array.from({ length: NB_SQUELETTES }, creerCarteSquelette);
  listeSalles.replaceChildren(...squelettes);
}

function afficherErreur() {
  listeSalles.replaceChildren();
  listeSalles.setAttribute("aria-busy", "false");
  compteur.textContent = "";
  etatErreur.hidden = false;
}

function afficherSalles(salles, nombre) {
  listeSalles.replaceChildren(...salles.map(creerCarteSalle));
  listeSalles.setAttribute("aria-busy", "false");
  etatErreur.hidden = true;
  etatVide.hidden = salles.length > 0;
  compteur.textContent = `${nombre} salle${nombre > 1 ? "s" : ""}`;
}


/* ---------- Filtres côté client ---------- */

function normaliser(texte) {
  return texte.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function lireFiltres() {
  const donnees = new FormData(formulaire);

  return {
    recherche: normaliser(donnees.get("q").trim()),
    quartier: donnees.get("quartier"),
    capaciteMin: Number(donnees.get("capacite")) || 0,
    equipements: donnees.getAll("equipements"),
  };
}

function salleCorrespond(salle, filtres) {
  return (
    normaliser(salle.nom).includes(filtres.recherche) &&
    (filtres.quartier === "" || salle.quartier === filtres.quartier) &&
    salle.capacite >= filtres.capaciteMin &&
    filtres.equipements.every((code) => salle.equipements.includes(code))
  );
}

function filtresActifs(filtres) {
  return (
    filtres.recherche !== "" ||
    filtres.quartier !== "" ||
    filtres.capaciteMin > 0 ||
    filtres.equipements.length > 0
  );
}

function appliquerFiltres() {
  const filtres = lireFiltres();
  const salles = toutesLesSalles.filter((salle) => salleCorrespond(salle, filtres));
  const nombre = filtresActifs(filtres) ? salles.length : totalSalles;

  afficherSalles(salles, nombre);
}

function reinitialiserFiltres() {
  formulaire.reset();
  appliquerFiltres();
}


/* ---------- Chargement de l'écran ---------- */

async function chargerSalles() {
  afficherChargement();

  try {
    const page = await recupererSalles();
    toutesLesSalles = page.contenu;
    totalSalles = page.total;
    appliquerFiltres();
  } catch {
    afficherErreur();
  }
}

formulaire.addEventListener("submit", (evenement) => evenement.preventDefault());
formulaire.addEventListener("input", appliquerFiltres);
document.querySelector("#bouton-reessayer").addEventListener("click", chargerSalles);
document.querySelector("#bouton-reinitialiser").addEventListener("click", reinitialiserFiltres);

/* Menu de navigation sur mobile */
const boutonMenu = document.querySelector(".entete__menu");
const navigation = document.querySelector("#navigation");

boutonMenu.addEventListener("click", () => {
  const ouvert = boutonMenu.getAttribute("aria-expanded") === "true";
  boutonMenu.setAttribute("aria-expanded", String(!ouvert));
  navigation.classList.toggle("navigation--ouverte", !ouvert);
});

chargerSalles();
