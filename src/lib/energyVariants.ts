import {
  getEligibleEnergyVariants,
  type CharacterEnergyData,
  type EnergySkillVariantData,
} from '../data/energyData';

function explicitConstellationReplacement(label: string): number | null {
  const match = label.match(/^Constellation\s*(\d+)$/i);
  return match ? Number(match[1]) : null;
}

/**
 * Picks the default skill variant without confusing constellation-gated
 * optional sources (for example Faruzan C6 triggers or Keqing C2 proc) with
 * true replacement variants such as "Constellation 6".
 */
export function getDefaultEnergyVariant(
  data: CharacterEnergyData | null,
  constellation: number
): EnergySkillVariantData | null {
  const eligible = getEligibleEnergyVariants(data, constellation);
  if (!eligible.length) return null;

  const replacements = eligible
    .map((variant) => ({ variant, requirement: explicitConstellationReplacement(variant.label) }))
    .filter((entry): entry is { variant: EnergySkillVariantData; requirement: number } => entry.requirement != null)
    .sort((a, b) => b.requirement - a.requirement);

  return replacements[0]?.variant ?? eligible[0];
}

export function getEnergyVariant(
  data: CharacterEnergyData | null,
  label: string | null,
  constellation: number
): EnergySkillVariantData | null {
  if (!data) return null;
  if (label) {
    const exact = getEligibleEnergyVariants(data, constellation).find((variant) => variant.label === label);
    if (exact) return exact;
  }
  return getDefaultEnergyVariant(data, constellation);
}
