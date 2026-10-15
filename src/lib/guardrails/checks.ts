import "server-only";

export type Channel = "chat" | "image" | "project";

export type SafetyVerdict =
  | { allowed: true }
  | { allowed: false; category: string; redirect: string };

const PROJECT_REDIRECT =
  "I keep our chats safe for kids. Let\u2019s get back to your project. What is one fact you want to write down?";

const UPSET_REDIRECT =
  "If you feel hurt or unsafe, please talk to a parent or a trusted adult. We can get back to your project when you are ready.";

const IMAGE_REDIRECT =
  "I can\u2019t make that picture. Let\u2019s show something you learned for your project.";

const JAILBREAK =
  /ignore\s+(all\s+|any\s+)?(the\s+|your\s+)?(previous\s+|prior\s+|above\s+)?(instructions|rules|prompt|safety)|disregard\s+(your|the|all|these)\s+(rules|instructions|prompt|safety)|forget\s+(your|the|all|these)\s+(rules|instructions|prompt)|override\s+(your|the|these)\s+(rules|instructions|safety)|jailbreak|do\s+anything\s+now|developer\s+mode|reveal\s+(your\s+)?(system\s+)?prompt|show\s+(me\s+)?(your\s+)?(system\s+)?(prompt|instructions)|what\s+are\s+your\s+(hidden\s+)?(instructions|rules|system\s+prompt)|you\s+have\s+no\s+(rules|restrictions|limits)|pretend\s+(you\s+have\s+no\s+rules|there\s+are\s+no\s+rules)|bypass\s+(your|the|these)\s+(rules|safety|filters)|new\s+(system\s+)?(instructions|rules)\s*:|^\s*(system|developer)\s*:/i;

const UPSET =
  /suicid|kill\s+myself|killing\s+myself|cut\s+myself|cutting\s+myself|self[-\s]?harm|hang\s+myself|want\s+to\s+die|end\s+my\s+life|anorexi|bulimi|starve\s+myself|pro\s*ana|\bkms\b/i;

const SEXUAL_WORDS = [
  "porn",
  "porno",
  "pornography",
  "nsfw",
  "hentai",
  "erotic",
  "orgasm",
  "penis",
  "vagina",
  "nipple",
  "nipples",
  "boob",
  "boobs",
  "horny",
  "slut",
  "whore",
  "rape",
  "rapist",
  "masturbate",
  "masturbating",
  "genital",
  "genitals",
  "intercourse",
  "hooker",
  "stripper",
  "xxx",
  "onlyfans",
  "nude",
  "nudes",
  "naked",
  "sex",
  "sexual",
  "sexy",
];

const SEXUAL_PHRASES = [
  "have sex",
  "having sex",
  "sex with",
  "want sex",
  "blow job",
  "hand job",
];

const LIFE_CYCLE =
  /\b(animal|animals|fish|whale|whales|dolphin|dolphins|turtle|turtles|bird|birds|mammal|mammals|insect|insects|frog|frogs|shark|sharks|clownfish|jellyfish|octopus|squid|life cycle|lifecycle|egg|eggs|born|male|female|baby|babies|pup|pups|calf|calves|seed|seeds|plant|plants)\b/;

const VIOLENCE_WORDS = [
  "gore",
  "gory",
  "dismember",
  "dismembered",
  "decapitate",
  "decapitated",
  "mutilate",
  "mutilated",
  "torture",
  "tortured",
  "bloodbath",
  "entrails",
  "behead",
  "beheaded",
  "bloody",
];

const VIOLENCE_PHRASES = [
  "how to hurt",
  "how to kill",
  "how to stab",
  "kill him",
  "kill her",
  "kill them",
  "kill someone",
  "kill a person",
  "kill an animal",
  "hurt someone",
  "hurt a person",
  "hurt an animal",
  "covered in blood",
  "blood everywhere",
  "lots of blood",
];

const WEAPON_WORDS = [
  "gun",
  "guns",
  "rifle",
  "rifles",
  "pistol",
  "pistols",
  "shotgun",
  "shotguns",
  "bomb",
  "bombs",
  "explosive",
  "explosives",
  "grenade",
  "grenades",
  "ammunition",
  "bullet",
  "bullets",
];

const WEAPON_PHRASES = [
  "how to make a weapon",
  "how to build a weapon",
  "how to use a weapon",
  "how to shoot someone",
  "how to shoot people",
  "how to shoot a person",
  "how to shoot him",
  "how to fight",
  "how to punch",
  "how to attack someone",
];

const DRUG_WORDS = [
  "alcohol",
  "beer",
  "beers",
  "vodka",
  "whiskey",
  "whisky",
  "rum",
  "tequila",
  "liquor",
  "wine",
  "wines",
  "cigarette",
  "cigarettes",
  "tobacco",
  "vape",
  "vaping",
  "marijuana",
  "cannabis",
  "cocaine",
  "heroin",
  "meth",
  "ecstasy",
  "opioid",
  "opioids",
  "drunk",
  "drunken",
];

const DRUG_PHRASES = [
  "get high",
  "getting high",
  "smoke weed",
  "do drugs",
  "how to vape",
  "how to smoke",
];

const HATE_AND_PROFANITY = [
  "fuck",
  "fucking",
  "fucker",
  "shit",
  "bullshit",
  "shitty",
  "bitch",
  "bastard",
  "asshole",
  "damn",
  "dammit",
  "crap",
  "dick",
  "cock",
  "pussy",
  "piss",
  "cunt",
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "retard",
  "retarded",
  "spic",
  "kike",
  "chink",
  "tranny",
  "hell",
  "ass",
];

const BULLY_PHRASES = [
  "how to bully",
  "help me bully",
  "bullying script",
  "help me insult",
  "how to insult",
];

const HORROR_WORDS = ["horror", "slasher", "zombie", "zombies", "demon", "demons"];

const HORROR_PHRASES = [
  "scary story",
  "scary stories",
  "horror story",
  "horror movie",
  "jump scare",
  "jumpscare",
  "haunted house",
  "tell me something scary",
  "something that will scare",
];

const SCAM_WORDS = ["gambling", "casino", "casinos", "phishing"];

const SCAM_PHRASES = [
  "credit card",
  "get rich quick",
  "wire transfer",
  "buy bitcoin",
  "crypto wallet",
  "bet money",
  "lottery ticket",
  "stock tips",
  "invest my money",
];

const PERSONAL_PHRASES = [
  "my address",
  "i live at",
  "my phone",
  "phone number",
  "my school is",
  "my full name",
  "my name is",
  "my password",
  "the password is",
  "where do you live",
  "what is your address",
  "what is your phone",
  "what school do you go",
  "my exact location",
  "social security",
  "what is your full name",
];

function soften(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase();
}

function leet(input: string): string {
  return soften(input)
    .replace(/@/g, "a")
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/[$5]/g, "s")
    .replace(/7/g, "t");
}

function hasWord(text: string, words: string[]): boolean {
  return words.some((word) => new RegExp(`\\b${word}\\b`, "i").test(text));
}

function hasPhrase(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function sexual(text: string): boolean {
  const stripped = text.replace(/\bnaked\s+mole\s*rats?\b/g, "mole-rat");
  if (hasPhrase(stripped, SEXUAL_PHRASES)) return true;
  const words = SEXUAL_WORDS.filter((word) => word !== "sex");
  if (hasWord(stripped, words)) return true;
  if (!/\bsex\b/.test(stripped)) return false;
  if (!LIFE_CYCLE.test(stripped)) return true;
  return false;
}

function weapons(text: string): boolean {
  const stripped = text.replace(/\b(water|glue|nail)\s+guns?\b/g, "");
  return hasWord(stripped, WEAPON_WORDS) || hasPhrase(stripped, WEAPON_PHRASES);
}

function personalData(text: string): boolean {
  if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text)) return true;
  if (/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/.test(text)) return true;
  if (
    /\b\d{1,5}\s+[a-z0-9.'-]+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)\b/.test(
      text,
    )
  ) {
    return true;
  }
  if (/\bpassword\b/.test(text)) return true;
  return hasPhrase(text, PERSONAL_PHRASES);
}

function blockedCategory(plain: string, coded: string): string | null {
  if (UPSET.test(plain) || UPSET.test(coded)) return "upset";
  if (JAILBREAK.test(plain) || JAILBREAK.test(coded)) return "jailbreak";
  if (sexual(plain) || sexual(coded)) return "sexual";
  if (
    hasWord(plain, VIOLENCE_WORDS) ||
    hasPhrase(plain, VIOLENCE_PHRASES) ||
    hasWord(coded, VIOLENCE_WORDS) ||
    hasPhrase(coded, VIOLENCE_PHRASES)
  ) {
    return "violence";
  }
  if (weapons(plain) || weapons(coded)) return "weapons";
  if (
    hasWord(plain, DRUG_WORDS) ||
    hasPhrase(plain, DRUG_PHRASES) ||
    hasWord(coded, DRUG_WORDS) ||
    hasPhrase(coded, DRUG_PHRASES)
  ) {
    return "drugs";
  }
  if (
    hasWord(plain, HATE_AND_PROFANITY) ||
    hasPhrase(plain, BULLY_PHRASES) ||
    hasWord(coded, HATE_AND_PROFANITY) ||
    hasPhrase(coded, BULLY_PHRASES)
  ) {
    return "language";
  }
  if (
    hasWord(plain, HORROR_WORDS) ||
    hasPhrase(plain, HORROR_PHRASES) ||
    hasWord(coded, HORROR_WORDS) ||
    hasPhrase(coded, HORROR_PHRASES)
  ) {
    return "horror";
  }
  if (personalData(plain)) return "personal";
  if (
    hasWord(plain, SCAM_WORDS) ||
    hasPhrase(plain, SCAM_PHRASES) ||
    hasWord(coded, SCAM_WORDS) ||
    hasPhrase(coded, SCAM_PHRASES)
  ) {
    return "scam";
  }
  return null;
}

function redirectFor(category: string, channel: Channel): string {
  if (category === "upset") return UPSET_REDIRECT;
  if (channel === "image") return IMAGE_REDIRECT;
  return PROJECT_REDIRECT;
}

export function checkText(input: string, channel: Channel): SafetyVerdict {
  const plain = soften(input);
  const coded = leet(input);
  const category = blockedCategory(plain, coded);
  if (!category) return { allowed: true };
  return { allowed: false, category, redirect: redirectFor(category, channel) };
}
