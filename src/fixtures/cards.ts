// The bundled fixture decks: public history and an obviously fictional family.
// They let the game, the tests and `npm run play` run with no backend.
// Real personal cards never go in this file or anywhere else in the repo.

import type { Card } from '../game/index.ts'
import type { Deck } from '../ui/setup.ts'

type Row = [id: string, title: string, reveal: string, year: number, month?: number, day?: number]

const history: Row[] = [
  ['h-marathon', 'Slaget ved Marathon', 'Athenerne stanser den persiske hæren.', -490],
  ['h-aleksander', 'Aleksander den store dør', 'Han dør i Babylon, 32 år gammel.', -323],
  ['h-caesar', 'Julius Cæsar blir drept', 'Drept i senatet i Roma på idus martii.', -44, 3, 15],
  ['h-pompeii', 'Vesuv begraver Pompeii', 'Byen forsvinner under aske etter et vulkanutbrudd.', 79],
  ['h-vestromerriket', 'Vestromerriket faller', 'Den siste keiseren i vest blir avsatt.', 476],
  ['h-lindisfarne', 'Vikingene angriper klosteret på Lindisfarne', 'Regnes ofte som starten på vikingtiden.', 793],
  ['h-stiklestad', 'Slaget på Stiklestad', 'Olav Haraldsson faller i slaget.', 1030, 7, 29],
  ['h-stamford-bridge', 'Slaget ved Stamford Bridge', 'Harald Hardråde faller i England.', 1066, 9, 25],
  ['h-hastings', 'Slaget ved Hastings', 'Vilhelm Erobreren vinner England.', 1066, 10, 14],
  ['h-magna-carta', 'Magna Carta blir beseglet', 'Kong Johan må godta grenser for kongens makt.', 1215, 6, 15],
  ['h-svartedauden', 'Svartedauden kommer til Norge', 'Pesten kommer med et skip til Bergen.', 1349],
  ['h-kalmarunionen', 'Kalmarunionen blir opprettet', 'Norge, Danmark og Sverige får felles konge.', 1397],
  ['h-konstantinopel', 'Konstantinopel faller', 'Osmanene inntar byen, og Østromerriket er over.', 1453, 5, 29],
  ['h-columbus', 'Columbus kommer til Amerika', 'Han går i land på en øy i Bahamas.', 1492, 10, 12],
  ['h-luther', 'Martin Luther legger fram de 95 tesene', 'Starten på reformasjonen.', 1517, 10, 31],
  ['h-usa', 'USA erklærer seg uavhengig', 'Uavhengighetserklæringen blir vedtatt 4. juli.', 1776, 7, 4],
  ['h-bastillen', 'Bastillen blir stormet i Paris', 'Starten på den franske revolusjonen.', 1789, 7, 14],
  ['h-grunnloven', 'Grunnloven blir undertegnet på Eidsvoll', 'Riksforsamlingen vedtok den dagen før.', 1814, 5, 17],
  ['h-waterloo', 'Slaget ved Waterloo', 'Napoleons siste nederlag.', 1815, 6, 18],
  ['h-darwin', 'Darwin gir ut «Artenes opprinnelse»', 'Boka som la fram teorien om naturlig utvalg.', 1859, 11, 24],
  ['h-rontgen', 'Röntgen oppdager røntgenstrålene', 'Han kaller dem X-stråler.', 1895, 11, 8],
  ['h-fredsprisen', 'Den første Nobels fredspris blir delt ut', 'Til Henry Dunant og Frédéric Passy.', 1901, 12, 10],
  ['h-wright', 'Brødrene Wright flyr for første gang', 'Den første flyturen varer i tolv sekunder.', 1903, 12, 17],
  ['h-unionen', 'Unionen med Sverige oppløses', 'Stortinget vedtar oppløsningen 7. juni.', 1905, 6, 7],
  ['h-einstein', 'Einstein legger fram den spesielle relativitetsteorien', 'Fra det som er kalt hans mirakelår.', 1905],
  ['h-sydpolen', 'Roald Amundsen når Sydpolen', 'Fem nordmenn kommer først til polpunktet.', 1911, 12, 14],
  ['h-titanic', 'Titanic synker', 'Skipet går ned på sin første reise.', 1912, 4, 15],
  ['h-stemmerett', 'Norske kvinner får allmenn stemmerett ved stortingsvalg', 'Norge er blant de første landene i verden.', 1913],
  ['h-krig-start', 'Første verdenskrig bryter ut', 'Østerrike-Ungarn erklærer Serbia krig.', 1914, 7, 28],
  ['h-krig-slutt', 'Første verdenskrig slutter', 'Våpenhvilen gjelder fra 11. november.', 1918, 11, 11],
  ['h-penicillin', 'Alexander Fleming oppdager penicillinet', 'En muggsopp i en skål dreper bakteriene.', 1928],
  ['h-invasjonen', 'Tyskland invaderer Norge', 'Angrepet kommer natt til 9. april.', 1940, 4, 9],
  ['h-frigjoringen', 'Norge blir fritt etter okkupasjonen', 'Frigjøringsdagen er 8. mai.', 1945, 5, 8],
  ['h-hiroshima', 'Atombomben blir sluppet over Hiroshima', 'Den første atombomben brukt i krig.', 1945, 8, 6],
  ['h-everest', 'Mount Everest blir besteget for første gang', 'Edmund Hillary og Tenzing Norgay når toppen.', 1953, 5, 29],
  ['h-sputnik', 'Sputnik 1 blir skutt opp', 'Den første satellitten i bane rundt jorda.', 1957, 10, 4],
  ['h-gagarin', 'Det første mennesket i rommet', 'Jurij Gagarin går én gang rundt jorda.', 1961, 4, 12],
  ['h-muren-bygges', 'Berlinmuren blir bygd', 'Byggingen starter natt til 13. august.', 1961, 8, 13],
  ['h-manen', 'Første menneske på månen', 'Neil Armstrong går ut av månelandingsfartøyet.', 1969, 7],
  ['h-ekofisk', 'Ekofisk-feltet blir funnet i Nordsjøen', 'Starten på det norske oljeeventyret.', 1969],
  ['h-ef', 'Norge sier nei til EF', 'Folkeavstemningen ender med nei-flertall.', 1972, 9],
  ['h-muren-faller', 'Berlinmuren faller', 'Grensen mellom Øst- og Vest-Berlin åpnes.', 1989, 11, 9],
  ['h-lillehammer', 'OL på Lillehammer åpner', 'Vinterlekene åpner 12. februar.', 1994, 2, 12],
  ['h-iphone', 'Det første iPhone-salget', 'Solgt fra 29. juni i USA.', 2007, 6, 29],
]

// The Testesen family does not exist. Every name and event here is invented.
const personal: Row[] = [
  ['p-torvald-fodt', 'Bestefar Torvald Testesen blir født', 'Født på kjøkkenet på Testerud gård.', 1938, 3, 12],
  ['p-bryllup', 'Alfhild og Torvald Testesen gifter seg', 'Det regnet hele dagen.', 1962, 6, 16],
  ['p-solveig-fodt', 'Mamma Solveig Testesen blir født', 'Tre uker før tiden.', 1965, 9, 3],
  ['p-hytta', 'Familien Testesen kjøper hytta på Prøvefjellet', 'Uten strøm og med utedo.', 1978, 7],
  ['p-embla-skole', 'Storesøster Embla Testesen begynner på skolen', 'Med rød ransel.', 1994, 8, 22],
  ['p-bergen', 'Familien Testesen flytter til Bergen', 'Flyttelasset kom to dager for sent.', 1998, 8, 1],
  ['p-pjokk-fodt', 'Lillebror Pjokk Testesen blir født', 'På selveste valentinsdagen.', 2001, 2, 14],
  ['p-bamsefar', 'Hunden Bamsefar kommer til familien Testesen', 'Åtte uker gammel og redd for støvsugeren.', 2005, 5, 20],
  ['p-bakekonkurranse', 'Tante Petronella Testesen vinner bakekonkurransen', 'Med en krokankake i fire etasjer.', 2009, 11],
  ['p-lofoten', 'Familien Testesen drar på telttur til Lofoten', 'Teltet blåste ned første natt.', 2012, 7, 10],
  ['p-sykkelverksted', 'Onkel Balder Testesen åpner sykkelverksted', 'I garasjen bak huset.', 2015, 4],
  ['p-torvald-80', 'Bestefar Torvald Testesen fyller 80 år', 'Feiret med bløtkake og trekkspill.', 2018, 3, 12],
]

// What each card is about, shown with the title while it is placed. Never the year. Most personal
// cards have none, as most cards in a real family deck will not.
const descriptions: Record<string, string> = {
  'h-marathon': 'Athenske soldater møter en persisk invasjonshær på en slette nordøst for Athen.',
  'h-aleksander': 'Kongen fra Makedonia har lagt under seg et rike fra Hellas til India.',
  'h-caesar': 'Romas diktator blir stukket ned av en gruppe senatorer, blant dem Brutus.',
  'h-pompeii': 'Et vulkanutbrudd ved Napolibukta legger en hel romersk by under aske.',
  'h-vestromerriket': 'En germansk hærfører avsetter gutten som er keiser i vest, og sender kronen til Konstantinopel.',
  'h-lindisfarne': 'Nordmenn plyndrer et kloster på en øy utenfor kysten av Nord-England.',
  'h-stiklestad': 'Olav Haraldsson prøver å vinne tilbake Norge og faller mot en bondehær i Trøndelag.',
  'h-stamford-bridge': 'Harald Hardråde vil erobre England, men blir overrasket av den engelske hæren nær York.',
  'h-hastings': 'Hertug Vilhelm av Normandie slår den engelske kongen Harald Godwinson.',
  'h-magna-carta': 'Engelske baroner tvinger kong Johan til å godta at også kongen er bundet av loven.',
  'h-svartedauden': 'En pest som har herjet Europa, når Bergen med et skip fra England.',
  'h-kalmarunionen': 'Margrete får Norge, Danmark og Sverige samlet under én konge.',
  'h-konstantinopel': 'Den osmanske sultanen Mehmet II erobrer hovedstaden i Østromerriket.',
  'h-columbus': 'En genovesisk sjøfarer i spansk tjeneste seiler vestover for å finne veien til Asia.',
  'h-luther': 'En tysk munk protesterer mot kirkens salg av avlatsbrev, og reformasjonen begynner.',
  'h-usa': 'Tretten britiske kolonier i Nord-Amerika bryter med kongen i London.',
  'h-bastillen': 'En folkemengde i Paris stormer et fengsel som er et symbol på kongens makt.',
  'h-grunnloven': 'Riksforsamlingen på Eidsvoll gir Norge en egen grunnlov og velger en konge.',
  'h-waterloo': 'Napoleons siste slag, mot britiske og prøyssiske styrker sør for Brussel.',
  'h-darwin': 'Den britiske naturforskeren forklarer hvordan arter endrer seg gjennom naturlig utvalg.',
  'h-rontgen': 'En tysk fysiker finner stråler som kan ta bilder av skjelettet gjennom huden.',
  'h-fredsprisen': 'Prisen fra Alfred Nobels testamente blir delt ut for første gang, i Kristiania.',
  'h-wright': 'To amerikanske brødre flyr et motordrevet fly på strendene i Nord-Carolina.',
  'h-unionen': 'Stortinget sier opp unionen med Sverige, og Norge blir et selvstendig land.',
  'h-einstein': 'En ung patentkontorist i Bern viser at tid og rom henger sammen med lysets fart.',
  'h-sydpolen': 'Fem nordmenn med hundesleder slår den britiske ekspedisjonen til Robert Scott.',
  'h-titanic': 'Verdens største skip treffer et isfjell i Nord-Atlanteren på sin første tur.',
  'h-stemmerett': 'Alle kvinner over 25 år får stemme ved valg til Stortinget, på lik linje med menn.',
  'h-krig-start': 'Skuddene i Sarajevo setter i gang en krig mellom Europas stormakter.',
  'h-krig-slutt': 'Våpnene tier på vestfronten etter fire år med skyttergravskrig.',
  'h-penicillin': 'En skotsk forsker ser at en muggsopp dreper bakteriene i en glemt petriskål.',
  'h-invasjonen': 'Tyske styrker angriper norske byer fra sjøen og lufta samme natt.',
  'h-frigjoringen': 'Tyskland kapitulerer, og fem år med okkupasjon av Norge er over.',
  'h-hiroshima': 'Et amerikansk fly slipper en atombombe over en japansk by.',
  'h-everest': 'En newzealender og en sherpa når toppen av verdens høyeste fjell.',
  'h-sputnik': 'Sovjetunionen sender en liten metallkule med radiosender i bane rundt jorda.',
  'h-gagarin': 'En sovjetisk pilot blir det første mennesket i verdensrommet.',
  'h-muren-bygges': 'Øst-Tyskland stenger grensen gjennom Berlin med piggtråd og betong.',
  'h-manen': 'Apollo 11 lander, og to amerikanske astronauter går på månen.',
  'h-ekofisk': 'Phillips finner olje i Nordsjøen, og Norge blir en oljenasjon.',
  'h-ef': 'Et flertall av velgerne sier nei til at Norge skal bli med i De europeiske fellesskap.',
  'h-muren-faller': 'Grensen i Berlin åpner etter en kunngjøring på en pressekonferanse, og folk river muren.',
  'h-lillehammer': 'Norge er vertskap for olympiske vinterleker for andre gang.',
  'h-iphone': 'Apple begynner å selge en telefon med berøringsskjerm og nesten ingen knapper.',
  'p-hytta': 'Hytta på Prøvefjellet, som hele familien Testesen bruker hver sommer.',
  'p-bamsefar': 'En liten berner sennenhund fra en gård i Telemark.',
}

function toCard(pool: Card['pool'], [id, title, reveal, year, month, day]: Row): Card {
  const card: Card = { id, title, reveal, year, pool }
  const description = descriptions[id]
  if (description !== undefined) card.description = description
  if (month !== undefined) card.month = month
  if (day !== undefined) card.day = day
  return card
}

export const fixtureDecks: Deck[] = [
  {
    id: 'historie',
    name: 'Historie',
    kind: 'history',
    visibility: 'public',
    cards: history.map((row) => toCard('history', row)),
  },
  {
    // In the real app a family deck is private and only listed for a device holding its code (T5).
    // This one is fictional and bundled, so it is listed for everyone.
    id: 'familien-testesen',
    name: 'Familien Testesen',
    kind: 'personal',
    visibility: 'private',
    cards: personal.map((row) => toCard('personal', row)),
  },
]

/** Every fixture card, from every deck. */
export const fixtureCards: Card[] = fixtureDecks.flatMap((deck) => deck.cards)
