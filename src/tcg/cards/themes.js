// Les 8 decks de départ à thème : les seuls qu'un nouveau joueur peut choisir (il n'en choisit qu'un).
// Chaque liste est faite à la main, pour que tout le monde y soit à sa place : pas de Sacha ni de Pikachu chez la Team Rocket,
// pas de Queudver chez les Gryffondor, pas de Sylas chez Demacia, pas de méchant avec Superman et Supergirl…
// (ça n'empêche pas d'autres cartes Team Rocket, Gryffondor… d'exister en dehors de ces decks).
// Deux cartes 7 par deck. Une carte sans « *n » est en 2 exemplaires.
// Les autres decks de départ (cards/*.js) restent ceux des adversaires bots et servent de modèle pour compléter un deck.

/** « id*1, id, id*2 » → { id: n } (2 exemplaires par défaut). */
const D = (s) => Object.fromEntries(s.split(",").map((x) => x.trim()).filter(Boolean).map((x) => { const [id, n] = x.split("*"); return [id.trim(), Number(n || 2)]; }));

export const THEMES = [
  {
    id: "theme-rocket", name: "Team Rocket", fam: "pokemon", pt: "Kanto", leader: "pokemon-giovanni-7",
    desc: "Giovanni et Mewtwo à 7, Jessie, James, Miaouss et l'Artikodin de la Team Rocket : voler les Pokémon des autres, et filer avant la fin.",
    cards: D(`pokemon-giovanni-7*1, pokemon-mewtwo-7*1, pokemon-artikodin-6, pokemon-jessie-et-james-3, pokemon-miaouss-4,
      pokemon-abo-2, pokemon-arbok-4, pokemon-smogo-2, pokemon-smogogo-4, pokemon-empiflor-4, pokemon-grotadmorv-4, pokemon-rattata-1,
      pokemon-nidoking-5, pokemon-rhinocorne-3, pokemon-rhinoferos-5, neutre-espion-2,
      pokemon-l-arene-loc, neutre-marche-noir-loc*1, neutre-forteresse-loc*1,
      pokemon-poke-ball-obj, pokemon-super-bonbon-obj, neutre-chaines-obj, pokemon-bandeau-choix-obj*1, pokemon-restes-obj*1,
      pokemon-capture-evt, neutre-fuite-evt, neutre-trahison-evt, pokemon-potion-evt`),
  },
  {
    id: "theme-orchidia", name: "Orchidia", fam: "legendaires", leader: "legendaires-jadina-7",
    desc: "Jadina et Jadilyna à 7, la famille royale d'Orchidia et les Légendaires, avec une version de Shimy qu'on ne trouve que dans ce deck.",
    cards: D(`legendaires-jadina-7*1, legendaires-jadilyna-7*1, legendaires-tenebris-6, legendaires-adeyrid-4, legendaires-kinder-2, legendaires-vangelis-3,
      legendaires-danael-3, legendaires-gryfenfer-3, legendaires-shimy-4, legendaires-razzia-3, legendaires-artemus-3, legendaires-amylada-3, legendaires-toopie-maker-2, neutre-diplomate-2,
      legendaires-orchidia-loc, neutre-grande-bibliotheque-loc, neutre-forteresse-loc,
      legendaires-le-baton-aigle-obj, legendaires-l-epee-d-or-obj*1, legendaires-leviathan-obj*1, legendaires-broches-de-shimy-obj, neutre-armure-obj, neutre-potion-de-soin-obj,
      legendaires-ensemble-on-est-legendaires-evt, legendaires-fusion-elementaire-evt, legendaires-resurrection-evt*1, neutre-heritage-evt, neutre-renfort-evt*1`),
  },
  {
    id: "theme-hawkins", name: "Hawkins", fam: "stranger", leader: "stranger-onze-7-2",
    desc: "Onze et Hopper à 7, la bande, Steve, Nancy et Joyce, avec une version de Dustin qu'on ne trouve que dans ce deck : on ne laisse jamais tomber un ami.",
    cards: D(`stranger-onze-7-2*1, stranger-jim-hopper-7*1, stranger-mike-wheeler-4, stranger-dustin-henderson-4, stranger-lucas-sinclair-5, stranger-will-byers-4,
      stranger-max-mayfield-3, stranger-steve-harrington-5, stranger-nancy-wheeler-5, stranger-jonathan-byers-3, stranger-joyce-byers-4, stranger-robin-buckley-2,
      stranger-erica-sinclair-1, stranger-eddie-munson-4, stranger-bob-newby-2, stranger-murray-bauman-2,
      stranger-hawkins-loc*1, stranger-le-sous-sol-des-wheeler-loc, stranger-starcourt-mall-loc*1,
      stranger-le-cerebro-obj, stranger-les-guirlandes-de-noel-obj, stranger-la-batte-cloutee-obj,
      stranger-les-amis-ne-mentent-pas-evt, stranger-saignement-de-nez-evt, stranger-partie-de-jeu-de-role-evt, stranger-fermer-le-portail-evt, stranger-sauve-de-justesse-evt`),
  },
  {
    id: "theme-gryffondor", name: "Gryffondor", fam: "hp", pt: "Gryffondor", leader: "hp-harry-potter-7",
    desc: "Harry et Dumbledore à 7, Hermione, Ron, McGonagall, Hagrid et les Weasley : le courage avant tout.",
    cards: D(`hp-harry-potter-7*1, hp-albus-dumbledore-7*1, hp-hermione-granger-6, hp-minerva-mcgonagall-6, hp-ron-weasley-5, hp-rubeus-hagrid-5, hp-remus-lupin-5,
      hp-ginny-weasley-4, hp-fred-weasley-3, hp-george-weasley-3, hp-olivier-dubois-3, hp-neville-londubat-2, hp-seamus-finnigan-2, hp-dobby-2, hp-hedwige-1, hp-fumseck-3,
      hp-la-salle-commune-de-gryffondor-loc, hp-poudlard-loc, hp-la-grande-salle-loc*1,
      hp-l-epee-de-gryffondor-obj, hp-la-cape-d-invisibilite-obj*1, hp-la-carte-du-maraudeur-obj, hp-l-eclair-de-feu-obj,
      hp-l-armee-de-dumbledore-evt, hp-expelliarmus-evt, hp-spero-patronum-evt, hp-protego-evt`),
  },
  {
    id: "theme-demacia", name: "Demacia", fam: "lol", pt: "Demacia", leader: "lol-galio-7",
    desc: "Galio et le roi Jarvan IV à 7, Poppy l'héroïne malgré elle avec son marteau, Garen, Lux, Fiora et Quinn : pour Demacia !",
    cards: D(`lol-galio-7*1, lol-jarvan-iv-7*1, lol-poppy-6, lol-garen-6, lol-shyvana-6, lol-lux-5, lol-fiora-5, lol-xin-zhao-4, lol-vayne-4, lol-lucian-4,
      lol-quinn-3, lol-sona-3, lol-soldat-de-l-avant-garde-2, lol-chasseur-de-mages-2, lol-valor-1,
      lol-la-grande-cite-de-demacia-loc, neutre-forteresse-loc,
      lol-le-marteau-d-orlon-obj, lol-bottes-de-mobilite-obj, neutre-armure-obj, lol-ange-gardien-obj*1, lol-balise-de-controle-obj*1,
      lol-pour-demacia-evt, lol-barriere-evt, lol-saut-eclair-evt, lol-teleportation-evt, neutre-parade-evt`),
  },
  {
    id: "theme-sith", name: "Sith", fam: "sw", pt: "Sith", leader: "sw-dark-vador-7",
    desc: "Dark Vador et Dark Sidious à 7, Dark Maul, Dooku, Kylo Ren, les Inquisiteurs et les Sœurs de la Nuit : le côté obscur.",
    cards: D(`sw-dark-vador-7*1, sw-palpatine-7-2*1, sw-comte-dooku-6, sw-kylo-ren-6, sw-dark-maul-5, sw-le-grand-inquisiteur-5, sw-snoke-5,
      sw-asajj-ventress-4, sw-savage-opress-4, sw-la-seconde-s-ur-4, sw-le-cinquieme-frere-4, sw-inquisiteur-3, sw-garde-pretorien-3, sw-chevalier-de-ren-3, sw-shin-hati-3, sw-s-ur-de-la-nuit-2,
      sw-mustafar-loc, sw-coruscant-loc,
      sw-sabre-laser-rouge-obj, sw-chasseur-tie-avance-obj, neutre-cape-d-ombre-obj, neutre-couronne-obj,
      sw-l-etranglement-de-force-evt, sw-executez-l-ordre-66-evt, neutre-trahison-evt, neutre-coup-du-destin-evt`),
  },
  {
    id: "theme-dc", name: "DC Comics", fam: "dc", leader: "dc-superman-7",
    desc: "Superman et Supergirl à 7, Power Girl, Krypto et Lois Lane, avec la Ligue des Justiciers : les derniers enfants de Krypton.",
    cards: D(`dc-superman-7*1, dc-supergirl-7*1, dc-power-girl-5*1, dc-krypto-2, dc-lois-lane-2,
      dc-wonder-woman-5, dc-martian-manhunter-5*1, dc-green-lantern-5*1, dc-flash-4, dc-cyborg-4, dc-hawkgirl-4, dc-shazam-4, dc-batman-4,
      dc-black-canary-3, dc-green-arrow-3, dc-zatanna-3,
      dc-metropolis-loc, dc-la-tour-de-guet-loc, neutre-forteresse-loc, dc-themyscira-loc,
      dc-le-lasso-de-verite-obj, dc-anneau-de-green-lantern-obj,
      dc-justice-evt, dc-le-serment-des-green-lantern-evt*1, neutre-heritage-evt, neutre-renfort-evt, neutre-parade-evt, neutre-coup-du-destin-evt`),
  },
  {
    id: "theme-meute", name: "La Meute", fam: "teenwolf", leader: "teenwolf-scott-mccall-7",
    desc: "Scott et Derek à 7, Stiles, Lydia, Allison, Kira, Malia et Liam : la meute de Beacon Hills et ceux qui la protègent.",
    cards: D(`teenwolf-scott-mccall-7*1, teenwolf-derek-hale-7*1, teenwolf-stiles-stilinski-3, teenwolf-lydia-martin-3, teenwolf-allison-argent-4, teenwolf-kira-yukimura-4,
      teenwolf-malia-tate-4, teenwolf-liam-dunbar-3, teenwolf-mason-hewitt-2, teenwolf-isaac-lahey-3, teenwolf-sherif-stilinski-3, teenwolf-melissa-mccall-2,
      teenwolf-alan-deaton-3, teenwolf-chris-argent-4, teenwolf-jordan-parrish-4, teenwolf-ethan-et-aiden-5,
      teenwolf-lycee-de-beacon-hills-loc, teenwolf-la-clinique-veterinaire-loc, teenwolf-le-nemeton-loc*1, teenwolf-le-manoir-hale-loc*1,
      teenwolf-la-jeep-de-stiles-obj, teenwolf-arc-d-allison-obj, teenwolf-cendre-de-sorbier-obj,
      teenwolf-hurlement-d-alpha-evt, teenwolf-pleine-lune-evt, neutre-renfort-evt, teenwolf-la-morsure-evt`),
  },
];
