// The bundled fixture deck: public history and an obviously fictional family.
// It lets the game, the tests and `npm run play` run with no backend.
// Real personal cards never go in this file or anywhere else in the repo.

import type { Card } from '../game/index.ts'

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

function toCard(pool: Card['pool'], [id, title, reveal, year, month, day]: Row): Card {
  const card: Card = { id, title, reveal, year, pool }
  if (month !== undefined) card.month = month
  if (day !== undefined) card.day = day
  return card
}

export const fixtureCards: Card[] = [
  ...history.map((row) => toCard('history', row)),
  ...personal.map((row) => toCard('personal', row)),
]
