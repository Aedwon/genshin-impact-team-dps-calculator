// Generated from the KQM Energy Recharge Calculator spreadsheet Data tab.
// Source workbook version: 1.79.0. Runtime calculations are local and deterministic.
import type { Element } from '../types';

export const ENERGY_DATA_VERSION = '1.79.0';

export interface EnergySkillVariantData {
  label: string;
  averageParticles?: number;
  flatEnergyPerUse?: number;
  variance?: number;
  particlesPerSecond?: number;
  duration?: number;
  minConstellation?: number;
}

export interface CharacterEnergyData {
  name: string;
  element: Element;
  variants: EnergySkillVariantData[];
  burstEnergy?: number;
  burstDiscount?: number;
  intrinsicERBonus?: number;
  help?: string;
}

type RawVariant = [
  label: string,
  averageParticles?: number | null,
  flatEnergyPerUse?: number | null,
  variance?: number | null,
  particlesPerSecond?: number | null,
  duration?: number | null,
  minConstellation?: number | null,
];
type RawCharacter = [
  name: string,
  element: Element,
  variants: RawVariant[],
  burstEnergy?: number | null,
  burstDiscount?: number | null,
  intrinsicERBonus?: number | null,
];

const RAW: RawCharacter[] = [["Aino","Hydro",[["Constellation 0",3,null,0,0,0,0],["Constellation 4",3,10,0,0,null,4]],50],["Albedo","Geo",[["Press",null,null,0.5,0.3,30]],40],["Alhaitham","Dendro",[["Projection Attack",1,null,0,0,0]],70],["Aloy","Cryo",[["Press",5,null,0,0,0]],40],["Alyosha","Electro",[["Constellation 0",5,null,0,0,0,0],["Constellation 1",5,15,0,0,0,1]],70],["Amber","Pyro",[["Press",4,null,0,0,0]],40],["Arlecchino","Pyro",[["Press",5,null,0,0,0]],60],["Ayaka","Cryo",[["Press",4.5,null,0.1111111111,0,0]],80],["Ayato","Hydro",[["On field",4.5,null,0.1111111111,0,0],["Off field",0,null,0.5,0],["Hybrid",1.5,null,0.3333333333,0]],80],["Baizhu","Dendro",[["Press",3.5,null,0.1428571429,0,0]],80],["Barbara","Hydro",[["Press",null,null,0.5,0,0]],80],["Beidou","Electro",[["0 stacks",2,null,0,0,0],["1 stack",3,null,0,0],["Perfect",4,null,0,0]],80],["Bennett","Pyro",[["Press",2.25,null,0.1111111111,0,0],["Hold",3,null,0,0]],60],["Candace","Hydro",[["Press",2,null,0,0,0],["Hold",3,null,0,0]],60],["Childe","Hydro",[["7-9s melee",3,null,0,0,0],["11s melee",4,null,0,0],["Aimed Shot",1,null,0,0]],60],["Charlotte","Cryo",[["Press",3,null,0,0,0],["Full Hold",5,null,0,0]],80],["Chasca","Anemo",[["Press",5,null,0,0,0]],60],["Chevreuse","Pyro",[["Press",4,null,0,0,0],["Hold",4,null,0,0,0]],60],["Chiori","Geo",[["Press",null,null,0.2,0.33,17],["Hold",null,null,0.2,0.33,17]],50],["Chongyun","Cryo",[["Press",4,null,0,0,0]],40],["Citlali","Cryo",[["Constellation 0",5,null,0,0,0,0],["Constellation 4",5,16,0,0,null,4]],60],["Clorinde","Electro",[["Press",4,null,0,0,0]],60],["Collei","Dendro",[["Press",3,null,0,0,0]],60],["Columbina","Hydro",[["Press",null,null,0.5,0.3325,25]],60],["Cyno","Electro",[["Press (no burst)",3,null,0,0,0],["Press (in burst)",1.33,null,0.2481203008,0]],80],["Dahlia","Hydro",[["Press",3,null,0,0,0]],60],["Dehya","Pyro",[["Constellation 0",null,null,0.5,0.33,12,0],["Constellation 2",null,null,0.5,0.33,18,2]],70],["Diluc","Pyro",[["3-skill combo",3.75,null,0.2,0,0]],40],["Diona","Cryo",[["Press",1.6,null,0.375,0,0],["Hold",4,null,0.25,0]],80],["Dori","Electro",[["Press",2,null,0,0,0]],80],["Durin","Pyro",[["Press",4,null,0,0,0]],70],["Escoffier","Cryo",[["Press",4,null,0,0,0]],60],["Emilie","Dendro",[["Press",null,null,0.5,0.33,22],["Burst",-1,null,0,0]],50],["Eula","Cryo",[["Press",1.5,null,0.3333333333,0,0],["Hold",2.5,null,0.2,0]],80],["Faruzan","Anemo",[["Aimed Shot",2,null,0,0,0],["No Aimed Shot",0,null,0,0],["C6 triggers",0,null,0,0.5,4,6]],80],["Fischl","Electro",[["Constellation 0",null,null,0.5,0.67,10,0],["Constellation 6",null,null,0.5,0.67,12,6]],60],["Flins","Electro",[["Constellation 0",4,null,0,0,0,0],["Constellation 1",4,null,0,0,null,1]],60],["Freminet","Cryo",[["Level 0 (no burst)",2,null,0,0,0],["Level 0 (burst)",1,null,0,0],["Level 4",1,null,0,0]],60],["Furina","Hydro",[["Salon Members",null,null,0,0.3,30],["Singer",null,null,0,0,30]],60],["Gaming","Pyro",[["Press",2,null,0,0,0]],60],["Ganyu","Cryo",[["Press",4,null,0,0,0]],60],["Gorou","Geo",[["Press",2,null,0,0,0]],80],["Heizou","Anemo",[["0-1 stacks",2,null,0,0,0],["2-3 stacks",2.5,null,0.2,0],["Full stacks",3,null,0,0]],40],["Hu Tao","Pyro",[["Press",4.8,null,0.1666666667,0,0]],60],["Iansan","Electro",[["Constellation 0",4,null,0,0,0,0],["Constellation 1",4,15,0,0,null,1]],70],["Ifa","Anemo",[["Press",4.3,null,0.06976744186,0,0]],60],["Illuga","Geo",[["Constellation 0",4.5,null,0.1111111111,0,0,0],["Constellation 1",4.5,12,0.11,0,null,1]],60],["Ineffa","Electro",[["Press",null,null,0.5,0.33,20]],60],["Itto","Geo",[["Press",3.5,null,0.1428571429,0,0]],70],["Jahoda","Anemo",[["Press",4,null,0,0,0]],70],["Jean","Anemo",[["Press",2.67,null,0.2509363296,0,0]],80,16],["Kachina","Geo",[["Independent",null,null,0.5,0.33,12],["Mounted",4,null,0.5,0]],70],["Kaeya","Cryo",[["0 freezes",2.67,null,0.2509363296,0,0],["1 freeze",3.67,null,0.1825613079,0],["2+ freezes",4.67,null,0.1434689507,0]],60],["Kaveh","Dendro",[["Press",2,null,0,0,0]],80],["Kazuha","Anemo",[["Press",3,null,0,0,0],["Hold",4,null,0,0]],60],["Keqing","Electro",[["Press",2.5,null,0.2,0,0],["C2 proc",1,null,0,0,null,2]],40],["Kirara","Dendro",[["Final Kick",3,null,0,0,0],["Collision",1,null,0,0]],60],["Kinich","Dendro",[["Press",5,null,0,0,0]],70],["Klee","Pyro",[["Press",4,null,0,0,0]],60],["Kokomi","Hydro",[["Refresh",null,null,0.5,0.33,12],["No refresh",null,null,0.5,0.33,12]],70],["Kuki Shinobu","Electro",[["Constellation 0",null,null,0.5,0.3,12,0],["Constellation 2",null,null,0.5,0.3,15,2],["Constellation 4",null,null,0.5,0.39,15,4]],60],["Layla","Cryo",[["1 volley",null,null,0.5,0.11,12],["2 volleys",null,null,0.5,0.22,12],["3 volleys",null,null,0.5,0.33,12]],40],["Lan Yan","Anemo",[["Press",3,null,0,0,0]],60],["Lauma","Dendro",[["Press",null,null,0.5,0.33,15]],60],["Lisa","Electro",[["Press",0,null,0.5,0,0],["Hold",5,null,0,0]],80],["Linnea","Geo",[["Press",null,null,0,0.33,25],["Lumi Hit",3,null,0,0]],60],["Lohen","Cryo",[["Press",5,null,0,0,0]],60],["Lynette","Anemo",[["Press",4,null,0,0,0],["Hold",4,null,0,0,0]],70],["Lyney","Pyro",[["Press",5,null,0,0,0]],60],["Mavuika","Pyro",[["Press",5,null,0,0,0]],0],["Mika","Cryo",[["Press",4,null,0,0,0],["Hold",4,null,0,0]],70],["Mona","Hydro",[["Press",3.33,null,0.0990990991,0,0]],60],["Mualani","Hydro",[["Press",4.5,null,0.1111111111,0,0]],60],["Nahida","Dendro",[["Press",null,null,0,0.36,25],["Hold",null,null,0,0.36,25]],50],["Navia","Geo",[["Press",3.5,null,0.1428571429,0,0]],60],["Nefer","Dendro",[["Press",2.67,null,0.2509363296,0,0]],60],["Neuvillette","Hydro",[["Press",4,null,0,0,0]],70],["Nicole","Pyro",[["Press",5,null,0,0,0]],60],["Nilou","Hydro",[["Press",4.5,null,0.1111111111,0,0]],70],["Ningguang","Geo",[["Press",3.4,null,0.1176470588,0,0]],40],["Noelle","Geo",[["Press",null,null,0.5,0,0]],60],["Odette","Cryo",[["Press",5,null,0,0,0]],60],["Ororon","Electro",[["Press",3,9,0,0,0]],60],["Prune","Anemo",[["Press",5,null,0,0,0]],70],["Qiqi","Cryo",[["Press",null,null,0.5,0.3333333333,18],["Herald of Frost",2,null,0]],80],["Raiden","Electro",[["Press",null,null,0.5,0.45,25]],90],["Razor","Electro",[["Press",3,null,0,0,0],["Hold",4,null,0,0]],80,5,45.0],["Rosaria","Cryo",[["Press",3,null,0,0,0]],60],["Sandrone","Cryo",[["Hit On-Field",1,null,0,0,0]],60],["Sara","Electro",[["Aimed Shot",3,null,0,0,0],["No Aimed Shot",0,null,0.5,0]],80],["Sayu","Anemo",[["Press",2,null,0,0,0],["Short Hold",3,null,0,0],["Full Hold",6,null,0,0]],80],["Sethos","Electro",[["Press",2,null,0,0,0],["Full CA",0,null,0,0],["Partial CA",0,null,0,0]],60],["Shenhe","Cryo",[["Press",3,null,0,0,0],["Hold",4,null,0,0]],80],["Sigewinne","Hydro",[["Press",4,null,0,0,0],["Hold",4,null,0,0,0]],70],["Skirk","Cryo",[["Attack",4,null,0,0,0]],0],["Sucrose","Anemo",[["Press",4,null,0,0,0]],80],["Tartaglia","Hydro",[["7-9s melee",3,null,0,0,0],["11s melee",4,null,0,0],["Aimed Shot",1,null,0,0]],60],["Tighnari","Dendro",[["Press",3.5,null,0.1428571429,0,0]],40],["Thoma","Pyro",[["Press",3.4,null,0.1176470588,0,0]],80],["Traveler (Anemo)","Anemo",[["Press",2,null,0,0,0],["Hold",3.33,null,0.0990990991,0]],60],["Traveler (Cryo)","Cryo",[["Press",3,null,0,0,0]],60],["Traveler (Dendro)","Dendro",[["Press",2.5,null,0.2,0,0]],80],["Traveler (Electro)","Electro",[["Press",1,null,0,0,0]],80],["Traveler (Geo)","Geo",[["Press",3.33,null,0.0990990991,0,0]],60],["Traveler (Hydro)","Hydro",[["Press",3.33,null,0.0990990991,0,0],["Hold",3.33,null,0.0990990991,0]],80],["Traveler (Pyro)","Pyro",[["Blazing Threshold",1,null,0,0,0]],70],["Varesa","Electro",[["Press",2.5,null,0.2,0,0],["Kablam",null,null,0,0]],70],["Varka","Anemo",[["Press",6,null,0,0,0]],60],["Venti","Anemo",[["Press",3,null,0,0,0],["Hold",4,null,0,0]],60,15],["Wanderer","Anemo",[["8-10s uptime",4,null,0,0,0],["6-8s uptime",3,null,0,0]],60],["Wriothesley","Cryo",[["NA during skill",1,null,0,0,0],["Vaulting Fist",1,null,0,0]],60],["Xiangling","Pyro",[["Press",null,null,0,0.5,8]],80],["Xianyun","Anemo",[["Press",5,null,0,0,0]],70],["Xiao","Anemo",[["Press",3,null,0,0,0]],70],["Xilonen","Geo",[["Press",4,null,0,0,0]],60],["Xingqiu","Hydro",[["Press",5,null,0,0,0]],80],["Xinyan","Pyro",[["Press",4,null,0,0,0]],60],["Yae Miko","Electro",[["3 totems",null,null,0,0.36,24]],90],["Yanfei","Pyro",[["Press",3,null,0,0,0]],80],["Yaoyao","Dendro",[["Press",null,null,0,0.5,10],["Hold",null,null,0,0.5,10]],80],["Yelan","Hydro",[["Press",4,null,0,0]],70],["Yoimiya","Pyro",[["Press",4,null,0,0,0]],60],["Yumemizuki Mizuki","Anemo",[["Press",4,null,0,0,0]],60],["Yun Jin","Geo",[["Press",2,null,0,0,0],["Level 1",2.5,null,0.2,0],["Level 2",3,null,0,0]],60],["Zhongli","Geo",[["Press",null,null,0.5,0.25,30],["Hold",null,null,0.5,0.25,30],["Miss pillar",null,null,0.5,0.25,0]],40],["Zibai","Geo",[["Press",4.7,null,0.06,0]],60]];
const HELP: Record<string, string> = {"Albedo":"Albedo's skill triggers every 2.5s and distributes its particles based on time spent on field. Albedo C1 gains 1.2 energy per E trigger. Put this in \"Bonus non-particle energy\".","Arlecchino":"Arlecchino's burst resets her skill cooldown. Arlecchino's Normal Attacks reduce her skill cooldown by .8s on hit. Arlecchino's C4 gives her 15 energy on burst. Divide this energy by the number of rotations between bursts. Put this in \"Bonus non-particle energy\". ","Ayato":"Ayato's A4 gives him 2 energy per second if he is not on field and has less than 40 energy. Put this in \"Bonus non-particle energy\". Hybrid Ayato does one attack after each E before swapping out.","Beidou":"Beidou's skill type is how many times she gets hit while holding her skill. Holding her skill will also accumulate a stack every 0.8s, with each stack restoring 8 energy for her. Put this in \"Bonus-non-particle energy\".","Charlotte":"When enemies marked by Charlotte's skill are defeated, its cooldown is reduced by 2s, up to a maximum of 8s. Charlotte's C4 gives her 2 flat energy for each marked enemy hit by her burst, up to 10.","Chasca":"Chasca's C4 restores up to 9 energy per Burst. Put this in \"Bonus non-particle energy\".","Chevreuse":"Chevreuse's C1 gives 6 energy to any ally with the Coordinated Tactics status that triggers Overload, once per 10 seconds. Put this in \"Bonus non-particle energy\".","Chongyun":"Chongyun C4 regenerates 1 Energy every time he hits an opponent affected by Cryo, once per 2 seconds. Put this in \"Bonus non-particle energy\".","Collei":"Collei's C1 gives her 20% ER when not on field. This reduces her ER needs by about 10%.","Dori":"Dori's A4 is already factored in, don't give her flat energy. Dori's C4 means some of your characters may need slighly less ER than recommended.","Fischl":"The Oz generated by Fischl's burst doesn't count as a skill use. \"Skill uses per rotation\" should be 0.5 if you use Fischl burst every second rotation.","Klee":"Klee's A4 gives every team member 2 energy whenever her charged attack crits. Put this in every character's \"Bonus non-particle energy\".","Mona":"Feed Mona's particles to whoever will be on field when her skill explodes.","Mualani":"Mualani's Sharky Bites can generate particles once per Skill use. Mualani's C4 restores 8 energy per puffer. She will gain 2 puffers per Skill.","Raiden":"Raiden's burst gives the entire team energy based on Raiden's ER, typically 20-25 energy. Put this in every character's \"Bonus non-particle energy\".","Rosaria":"Rosaria's C4 gives her 5 energy when her skill crits. Put this in \"Bonus non-particle energy\".","Tartaglia":"If Tartaglia is using ranged burst, put 20 in \"Bonus non-particle energy\". Use the \"Aimed Shot\" skill in \"Skill uses (other type)\" for the number of aimed shots done in ranged form.","Traveler (Dendro)":"Dendro Traveler's C1 is already factored in and does not need to be added. Exaiphanes Blade allows Traveler to restore up to 5 energy on hit with a 5s ICD. Put this in \"Bonus non-particle energy\". ","Traveler (Pyro)":"Blazing Threshold can trigger once every 2.9s, for a max of 4 per Skill. C2 and Burst restore Nightsoul Points for more particles. They gain 5 energy when a Pyro reaction is triggered with a 12s cooldown and 4 energy when a teammate triggers Nightsoul Burst. Exaiphanes Blade allows Traveler to restore up to 5 energy on hit with a 5s ICD. Put this in \"Bonus non-particle energy\".","Venti":"Venti's burst cost is reduced by 15 due to his A4 passive. It also gives energy to any characters of the element absorbed by the burst. Put this in those characters' \"Bonus non-particle energy\".","Wanderer":"If Wanderer absorbs Electro with his skill, he will gain approximately 13 energy per skill use. Put this in \"Bonus non-particle energy\".","Xilonen":"Xilonen can trigger Nightsoul Burst an additional time due to her A4 passive, with a 14s ICD. Add 6 flat energy if using Scroll. Put this in \"Bonus non-particle energy\".","Xingqiu":"Xingqiu's C6 gives him 3 energy on every third Sword Rain trigger, typically 12 energy in total. Put this in \"Bonus non-particle energy\". Divide this energy by the number of rotations between bursts.","Yae Miko":"One use of Yae's skill represents all 3 totems. Yae generates a particle once per 2.5-3s, 2.75s is assumed as average. Yae's C1 gives her up to 24 flat energy. Yae's C4 restores 8 energy on skill hit with a 5s ICD. Put this in \"Bonus non-particle energy\".","Yaoyao":"Yaoyao's C2 gives her 15 flat energy if she stays on field during her burst. Put this in \"Bonus non-particle energy\". Yaoyao's radishes only generate particles if the explosion hits an enemy.","Yumemizuki Mizuki":"Mizuki's skill only generates energy when she is on-field. Mizuki's C4 restores 20 energy per Burst. Put this in \"Bonus non-particle energy\"."};

export const CHARACTER_ENERGY_DATA: CharacterEnergyData[] = RAW.map(([name, element, variants, burstEnergy, burstDiscount, intrinsicERBonus]) => ({
  name,
  element,
  variants: variants.map(([label, averageParticles, flatEnergyPerUse, variance, particlesPerSecond, duration, minConstellation]) => ({
    label,
    ...(averageParticles != null ? { averageParticles } : {}),
    ...(flatEnergyPerUse != null ? { flatEnergyPerUse } : {}),
    ...(variance != null ? { variance } : {}),
    ...(particlesPerSecond != null ? { particlesPerSecond } : {}),
    ...(duration != null ? { duration } : {}),
    ...(minConstellation != null ? { minConstellation } : {}),
  })),
  ...(burstEnergy != null ? { burstEnergy } : {}),
  ...(burstDiscount != null ? { burstDiscount } : {}),
  ...(intrinsicERBonus != null ? { intrinsicERBonus } : {}),
  ...(HELP[name] ? { help: HELP[name] } : {}),
}));

const ALIASES: Record<string, string> = {"Kamisato Ayaka":"Ayaka","Kamisato Ayato":"Ayato","Kaedehara Kazuha":"Kazuha","Sangonomiya Kokomi":"Kokomi","Shikanoin Heizou":"Heizou","Kujou Sara":"Sara","Raiden Shogun":"Raiden","Arataki Itto":"Itto"};
const BY_NAME = new Map(CHARACTER_ENERGY_DATA.map((row) => [row.name.toLowerCase(), row]));

export function getCharacterEnergyData(characterName: string | null): CharacterEnergyData | null {
  if (!characterName) return null;
  const direct = BY_NAME.get(characterName.toLowerCase());
  if (direct) return direct;
  const alias = ALIASES[characterName];
  return alias ? BY_NAME.get(alias.toLowerCase()) ?? null : null;
}

function variantRequirement(label: string): number | null {
  const match = label.match(/(?:Constellation|C)\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

export function getEligibleEnergyVariants(data: CharacterEnergyData | null, constellation: number): EnergySkillVariantData[] {
  if (!data) return [];
  return data.variants.filter((variant) => {
    const requirement = variant.minConstellation ?? variantRequirement(variant.label);
    return requirement == null || constellation >= requirement;
  });
}

export function getDefaultEnergyVariant(data: CharacterEnergyData | null, constellation: number): EnergySkillVariantData | null {
  const eligible = getEligibleEnergyVariants(data, constellation);
  if (!eligible.length) return null;
  const constellationVariants = eligible
    .map((variant) => ({ variant, requirement: variant.minConstellation ?? variantRequirement(variant.label) }))
    .filter((entry): entry is { variant: EnergySkillVariantData; requirement: number } => entry.requirement != null)
    .sort((a, b) => b.requirement - a.requirement);
  return constellationVariants[0]?.variant ?? eligible[0];
}

export function getEnergyVariant(data: CharacterEnergyData | null, label: string | null, constellation: number): EnergySkillVariantData | null {
  if (!data) return null;
  if (label) {
    const exact = data.variants.find((variant) => variant.label === label);
    if (exact) {
      const requirement = exact.minConstellation ?? variantRequirement(exact.label);
      if (requirement == null || constellation >= requirement) return exact;
    }
  }
  return getDefaultEnergyVariant(data, constellation);
}
