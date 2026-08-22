import { getCharacter } from '../lib/genshinData';
import type { Element, Unit } from '../types';

const ELEMENT_TYPE_MAP: Record<string, Element> = {
  ELEMENT_PYRO: 'Pyro',
  ELEMENT_HYDRO: 'Hydro',
  ELEMENT_ELECTRO: 'Electro',
  ELEMENT_CRYO: 'Cryo',
  ELEMENT_ANEMO: 'Anemo',
  ELEMENT_GEO: 'Geo',
  ELEMENT_DENDRO: 'Dendro',
  ELEMENT_NONE: 'Physical',
};

export interface CharacterVisualInfo {
  name: string;
  element: Element;
  imageUrl: string | null;
  rarity: number | null;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('');
}

export function getCharacterVisualInfo(unit: Unit): CharacterVisualInfo {
  const name = unit.characterName ?? 'Unassigned';
  const character = unit.characterName ? getCharacter(unit.characterName) : undefined;
  const imageUrl = character?.images?.hoyowiki_icon
    ?? character?.images?.mihoyo_icon
    ?? character?.images?.portrait
    ?? character?.images?.card
    ?? null;

  return {
    name,
    element: ELEMENT_TYPE_MAP[character?.elementType] ?? 'Physical',
    imageUrl,
    rarity: typeof character?.rarity === 'number' ? character.rarity : null,
  };
}

export function CharacterAvatar({ unit, size = 'md' }: { unit: Unit; size?: 'sm' | 'md' | 'lg' }) {
  const visual = getCharacterVisualInfo(unit);

  return (
    <span
      className={`character-avatar character-avatar--${size}`}
      data-element={visual.element.toLowerCase()}
      aria-hidden="true"
    >
      <span className="character-avatar-fallback">{initials(visual.name)}</span>
      {visual.imageUrl && (
        <img
          src={visual.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
      )}
    </span>
  );
}
