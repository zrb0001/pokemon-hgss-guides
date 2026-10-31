import pokedex from '../../docs/data/pokemon.json'
import moveData from '../../docs/data/move-data.json'
import abilityData from '../../docs/data/abilities.json'

export { pokedex, moveData, abilityData }

export type Pokemon = (typeof pokedex.pokemon)[number]
export type Move = (typeof moveData.moves)[number]

export const pokemonById = new Map(pokedex.pokemon.map((entry) => [entry.id, entry]))
export const moveById = new Map(moveData.moves.map((entry) => [entry.id, entry]))

export function number(id: number) {
  return String(id).padStart(3, '0')
}

export function localizedName(entry: { names: { zh: string; ja: string; en: string } }) {
  return `${entry.names.zh}（${entry.names.ja} / ${entry.names.en}）`
}

export function value(input: number | null, suffix = '') {
  return input === null ? '—' : `${input}${suffix}`
}
