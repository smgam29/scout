export type BriefKind = "ask" | "write" | "pictures";

/** One checklist step in the project brief. */
export type BriefItem = {
  id: string;
  kind: BriefKind;
  /** Short kid-facing checklist label. */
  label: string;
  /**
   * Words from the answer used to detect What I learned.
   * For ask steps, pasting the chat question alone is not enough.
   */
  clues: string[];
  /** If true, every clue must appear (e.g. list all four seasons). */
  requireAllClues?: boolean;
};

export type Project = {
  id: string;
  title: string;
  /** Short overview of the project. */
  task: string;
  imageCount: number;
  prompts: string[];
  hints: string[];
  /** Structured research steps shown in the left checklist. */
  briefs: BriefItem[];
  source: "starter" | "model";
  notice: string | null;
};

export type ProjectTemplate = Omit<Project, "notice" | "source">;

type ResearchAsk = {
  /** Checklist line — research job that must end up in What I learned. */
  label: string;
  /**
   * Words from the *answer* (not the question). Used to detect What I learned.
   * Pasting the chat prompt alone should not mark the step done.
   */
  clues: string[];
  /** Open chat starter (not a copy-paste of the checklist). */
  prompt: string;
  requireAllClues?: boolean;
};

type StarterDraft = {
  id: string;
  title: string;
  /** Phrase used in the overview (“Research …”). */
  topic: string;
  asks: [ResearchAsk, ResearchAsk, ResearchAsk];
  write: ResearchAsk;
  hints: [string, string];
  pictureLabel: string;
};

function makeStarter(draft: StarterDraft): ProjectTemplate {
  return {
    id: draft.id,
    title: draft.title,
    task: `Research ${draft.topic}. Use chat to find facts, write what you learned in your own words, and make 2 pictures.`,
    imageCount: 2,
    prompts: [
      draft.asks[0].prompt,
      draft.asks[1].prompt,
      draft.asks[2].prompt,
      draft.write.prompt,
    ],
    hints: [...draft.hints],
    briefs: [
      ...draft.asks.map((ask, index) => ({
        id: `${draft.id}-ask-${index + 1}`,
        kind: "ask" as const,
        label: ask.label,
        clues: ask.clues,
        requireAllClues: ask.requireAllClues,
      })),
      {
        id: `${draft.id}-write`,
        kind: "write",
        label: draft.write.label,
        clues: draft.write.clues,
        requireAllClues: draft.write.requireAllClues,
      },
      {
        id: `${draft.id}-pictures`,
        kind: "pictures",
        label: draft.pictureLabel,
        clues: [],
      },
    ],
  };
}

const STARTER_DRAFTS: StarterDraft[] = [
  {
    id: "sea-animals",
    title: "Sea animals",
    topic: "sea animals",
    asks: [
      {
        label: "Research how a sea turtle gets air, then add the answer to What I learned",
        clues: ["lung", "surface", "air"],
        prompt: "I need help understanding sea turtle breathing for my notes.",
      },
      {
        label: "Pick one deep-ocean animal and add where it lives to What I learned",
        clues: ["dark", "deep", "angler", "giant squid", "viperfish", "pressure"],
        prompt: "Help me choose a deep-ocean animal and learn where it lives.",
      },
      {
        label: "Find the fastest swimmer in the sea and how fast it goes — add both to What I learned",
        clues: ["sailfish", "mph", "km", "hour", "speed"],
        prompt: "I want to compare sea animal speeds for my project.",
      },
    ],
    write: {
      label: "Write in your own words about dolphins",
      clues: ["dolphin"],
      prompt: "Can you tell me about dolphins so I can rewrite it in my own words?",
    },
    hints: ["A sea turtle coming up for air", "A pod of dolphins near the surface"],
    pictureLabel: "Make 2 pictures about sea animals",
  },
  {
    id: "weather-watch",
    title: "Weather watch",
    topic: "rain, clouds, and wind",
    asks: [
      {
        label: "Explain how rain forms in your notes (not just the question)",
        clues: ["droplet", "heavy", "fall", "vapor", "condense"],
        prompt: "I need help explaining rain in simple words for my notes.",
      },
      {
        label: "Explain what makes wind, then add that explanation to What I learned",
        clues: ["air", "pressure", "warm", "cool", "move"],
        prompt: "Help me understand wind so I can write it myself.",
      },
      {
        label: "Compare a hurricane and a cyclone — say how they are alike and different in What I learned",
        clues: ["same", "name", "ocean", "region", "typhoon", "storm"],
        prompt: "I am stuck comparing hurricanes and cyclones.",
      },
    ],
    write: {
      label: "Write in your own words about storms",
      clues: ["storm"],
      prompt: "Tell me about storms so I can put it in my own words.",
    },
    hints: ["A dark cloud dropping rain on a field", "Wind pushing a kite in a bright sky"],
    pictureLabel: "Make 2 pictures about weather",
  },
  {
    id: "sky-neighbors",
    title: "Moon, Sun, and a planet",
    topic: "the Moon, the Sun, and one planet",
    asks: [
      {
        label: "Compare the Moon and the Sun in What I learned (light, heat, or size)",
        clues: ["light", "heat", "star", "reflect", "bigger", "closer"],
        prompt: "Help me compare the Moon and the Sun for my notes.",
      },
      {
        label: "Choose a planet and add two true facts about it to What I learned",
        clues: ["mars", "jupiter", "saturn", "venus", "mercury", "neptune", "uranus", "ring", "red", "gas"],
        prompt: "Help me pick a planet and gather facts I can rewrite.",
      },
      {
        label: "Decide which planet is hottest and why — put your reason in What I learned",
        clues: ["venus", "atmosphere", "trap", "hot"],
        prompt: "I need help figuring out the hottest planet and why.",
      },
    ],
    write: {
      label: "Write in your own words about that planet",
      clues: ["planet", "mars", "jupiter", "saturn", "venus", "mercury", "neptune", "uranus", "earth"],
      prompt: "Give me planet facts I can turn into my own sentences.",
    },
    hints: ["The Moon with gray craters in a dark sky", "The Sun shining on the Earth"],
    pictureLabel: "Make 2 pictures about space",
  },
  {
    id: "animal-homes",
    title: "Animal homes",
    topic: "animal homes like nests and burrows",
    asks: [
      {
        label: "Explain why nests help baby birds — add your explanation to What I learned",
        clues: ["egg", "safe", "baby", "chick", "protect"],
        prompt: "Help me understand why nests matter so I can write it myself.",
      },
      {
        label: "Name a burrow animal and what the burrow is for — add both to What I learned",
        clues: ["rabbit", "meerkat", "fox", "hid", "underground", "tunnel"],
        prompt: "Help me research an animal that lives in a burrow.",
      },
      {
        label: "Compare a nest and a den in What I learned",
        clues: ["tree", "ground", "cave", "bird", "mammal", "den"],
        prompt: "I want to compare nests and dens for my project.",
      },
    ],
    write: {
      label: "Write in your own words about bees",
      clues: ["bee"],
      prompt: "Tell me about bees so I can rewrite it in my own words.",
    },
    hints: ["A bird nest with eggs in a tree", "A rabbit burrow under the grass"],
    pictureLabel: "Make 2 pictures about animal homes",
  },
  {
    id: "from-seed",
    title: "From seed to plant",
    topic: "how a seed becomes a plant",
    asks: [
      {
        label: "List what a seed needs to grow in What I learned",
        clues: ["water", "soil", "light", "sun", "warm"],
        prompt: "Help me figure out what seeds need so I can write a list.",
      },
      {
        label: "Describe the next step after the root grows — add it to What I learned",
        clues: ["shoot", "stem", "leaf", "up"],
        prompt: "What happens after the root, in kid words I can reuse?",
      },
      {
        label: "Compare a seed and a sprout in What I learned",
        clues: ["seed", "sprout", "grow", "root"],
        prompt: "Help me compare a seed and a sprout for my notes.",
      },
    ],
    write: {
      label: "Write in your own words about sprouts",
      clues: ["sprout"],
      prompt: "Tell me about sprouts so I can put it in my own words.",
    },
    hints: ["A seed in damp soil", "A young plant with green leaves in the sun"],
    pictureLabel: "Make 2 pictures about seeds and plants",
  },
  {
    id: "volcanoes",
    title: "Volcanoes",
    topic: "volcanoes",
    asks: [
      {
        label: "Explain what magma is in What I learned",
        clues: ["melt", "rock", "under", "earth", "underground"],
        prompt: "Help me understand magma for my notes.",
      },
      {
        label: "Explain why eruptions happen — add the reason to What I learned",
        clues: ["pressure", "gas", "push", "rise", "escape"],
        prompt: "I need a simple reason volcanoes erupt.",
      },
      {
        label: "Compare magma and lava in What I learned",
        clues: ["inside", "outside", "surface", "erupt"],
        prompt: "Help me compare magma and lava so I can write the difference.",
      },
    ],
    write: {
      label: "Write in your own words about lava",
      clues: ["lava"],
      prompt: "Tell me about lava so I can rewrite it myself.",
    },
    hints: ["A tall volcano with a glowing crater", "Orange lava flowing down a rocky slope"],
    pictureLabel: "Make 2 pictures about volcanoes",
  },
  {
    id: "dinosaurs",
    title: "Dinosaurs",
    topic: "dinosaurs",
    asks: [
      {
        label: "Explain what a fossil is in What I learned",
        clues: ["rock", "bone", "remain", "preserved", "print"],
        prompt: "Help me understand fossils for my project notes.",
      },
      {
        label: "Name a plant-eating dinosaur and one fact — add both to What I learned",
        clues: ["triceratops", "stegosaurus", "brachiosaurus", "diplodocus", "plant", "herbivore"],
        prompt: "Help me pick a plant-eating dinosaur and learn a fact.",
      },
      {
        label: "Find a huge dinosaur and about how long it was — add the size to What I learned",
        clues: ["meter", "feet", "long", "tall", "ton"],
        prompt: "I want a dinosaur size fact for my notes.",
      },
    ],
    write: {
      label: "Write in your own words about T. rex",
      clues: ["rex", "tyrannosaurus"],
      prompt: "Tell me about T. rex so I can write it in my own words.",
    },
    hints: ["A friendly cartoon T. rex in a sunny valley", "Fossils in layers of rock"],
    pictureLabel: "Make 2 pictures about dinosaurs",
  },
  {
    id: "insects",
    title: "Busy insects",
    topic: "insects",
    asks: [
      {
        label: "State how many legs insects have in What I learned",
        clues: ["six", "6"],
        prompt: "Help me check insect legs for my notes.",
      },
      {
        label: "Describe one butterfly life stage in What I learned",
        clues: ["egg", "caterpillar", "chrysalis", "pupa", "cocoon"],
        prompt: "Help me learn butterfly life stages I can rewrite.",
      },
      {
        label: "Find a fast insect and its speed — add both to What I learned",
        clues: ["dragonfly", "mph", "km", "hour", "fast"],
        prompt: "I want to research insect speeds for my project.",
      },
    ],
    write: {
      label: "Write in your own words about ants",
      clues: ["ant"],
      prompt: "Tell me about ants so I can put it in my own words.",
    },
    hints: ["A colorful butterfly on a flower", "Ants marching on a leaf"],
    pictureLabel: "Make 2 pictures about insects",
  },
  {
    id: "rainforest",
    title: "Rainforest layers",
    topic: "rainforests",
    asks: [
      {
        label: "Explain what the canopy is in What I learned",
        clues: ["top", "tree", "layer", "leaf", "sun"],
        prompt: "Help me understand the canopy for my notes.",
      },
      {
        label: "Choose a rainforest animal and its layer — add both to What I learned",
        clues: ["parrot", "sloth", "jaguar", "monkey", "toucan", "canopy", "floor", "understory"],
        prompt: "Help me match a rainforest animal to a layer.",
      },
      {
        label: "Compare the canopy and forest floor in What I learned",
        clues: ["dark", "bright", "sun", "soil", "leaf"],
        prompt: "I want to compare canopy and forest floor.",
      },
    ],
    write: {
      label: "Write in your own words about the forest floor",
      clues: ["floor"],
      prompt: "Tell me about the forest floor so I can rewrite it.",
    },
    hints: ["Tall green trees with a sunny canopy", "A colorful parrot in rainforest leaves"],
    pictureLabel: "Make 2 pictures about rainforests",
  },
  {
    id: "oceans-layers",
    title: "Ocean layers",
    topic: "the layers of the ocean",
    asks: [
      {
        label: "Explain the sunlight zone in What I learned",
        clues: ["light", "plant", "photosynthesis", "shallow", "bright"],
        prompt: "Help me understand the sunlight zone for notes.",
      },
      {
        label: "Explain why the deep ocean is dark — add the reason to What I learned",
        clues: ["light", "reach", "sun", "deep"],
        prompt: "Why is the deep ocean dark? I need a reason for my notes.",
      },
      {
        label: "Add one ocean-depth fact with a number to What I learned",
        clues: ["meter", "mile", "km", "feet", "deep"],
        prompt: "Give me an ocean depth fact with a number I can rewrite.",
      },
    ],
    write: {
      label: "Write in your own words about coral reefs",
      clues: ["coral", "reef"],
      prompt: "Tell me about coral reefs so I can write it myself.",
    },
    hints: ["Bright fish swimming near a coral reef", "A dark deep-ocean scene with soft blue light"],
    pictureLabel: "Make 2 pictures about the ocean",
  },
  {
    id: "rocks-minerals",
    title: "Rocks and minerals",
    topic: "rocks and minerals",
    asks: [
      {
        label: "Explain how igneous rock forms in What I learned",
        clues: ["cool", "magma", "lava", "melt"],
        prompt: "Help me understand igneous rock for my notes.",
      },
      {
        label: "Explain what a mineral is in What I learned",
        clues: ["natural", "solid", "crystal", "pure"],
        prompt: "Help me define mineral in kid words.",
      },
      {
        label: "Compare rock and mineral in What I learned",
        clues: ["mix", "made", "one", "many", "together"],
        prompt: "Help me compare rocks and minerals.",
      },
    ],
    write: {
      label: "Write in your own words about crystals",
      clues: ["crystal"],
      prompt: "Tell me about crystals so I can rewrite it.",
    },
    hints: ["Shiny crystals in a rock cave", "Smooth river rocks of many colors"],
    pictureLabel: "Make 2 pictures about rocks",
  },
  {
    id: "water-cycle",
    title: "Water cycle",
    topic: "the water cycle",
    asks: [
      {
        label: "Explain evaporation in What I learned",
        clues: ["vapor", "gas", "sun", "heat", "rise"],
        prompt: "Help me explain evaporation for my notes.",
      },
      {
        label: "Explain condensation in What I learned",
        clues: ["cloud", "cool", "drop", "liquid"],
        prompt: "Help me explain condensation for my notes.",
      },
      {
        label: "Compare evaporation and condensation in What I learned",
        clues: ["up", "down", "heat", "cool", "vapor", "cloud"],
        prompt: "Help me compare evaporation and condensation.",
      },
    ],
    write: {
      label: "Write in your own words about precipitation",
      clues: ["precipitat", "rain", "snow"],
      prompt: "Tell me about precipitation so I can put it in my own words.",
    },
    hints: ["Sun warming a lake with rising mist", "Rain falling on green hills"],
    pictureLabel: "Make 2 pictures about the water cycle",
  },
  {
    id: "magnets",
    title: "Magnets",
    topic: "magnets",
    asks: [
      {
        label: "Name the two poles and what that means in What I learned",
        clues: ["north", "south"],
        prompt: "Help me understand magnet poles for my notes.",
      },
      {
        label: "List metals magnets stick to in What I learned",
        clues: ["iron", "steel", "nickel"],
        prompt: "Which metals stick to magnets? I need facts for notes.",
      },
      {
        label: "Explain what two north poles do — add it to What I learned",
        clues: ["repel", "push", "away"],
        prompt: "What happens with two north poles? I need to write the answer.",
      },
    ],
    write: {
      label: "Write in your own words about attraction",
      clues: ["attract", "pull"],
      prompt: "Explain magnetic attraction so I can rewrite it.",
    },
    hints: ["A horseshoe magnet lifting paper clips", "Two magnets pulling toward each other"],
    pictureLabel: "Make 2 pictures about magnets",
  },
  {
    id: "simple-machines",
    title: "Simple machines",
    topic: "simple machines",
    asks: [
      {
        label: "Explain what a lever does in What I learned",
        clues: ["bar", "fulcrum", "lift", "force", "pivot"],
        prompt: "Help me understand levers for my notes.",
      },
      {
        label: "Explain how a ramp helps — add the reason to What I learned",
        clues: ["easier", "slope", "less", "force", "gradual"],
        prompt: "Help me explain ramps in simple words.",
      },
      {
        label: "Compare a lever and a pulley in What I learned",
        clues: ["wheel", "rope", "bar", "lift"],
        prompt: "Help me compare levers and pulleys.",
      },
    ],
    write: {
      label: "Write in your own words about pulleys",
      clues: ["pulley"],
      prompt: "Tell me about pulleys so I can write it myself.",
    },
    hints: ["A kid using a lever to lift a rock", "A pulley lifting a bucket"],
    pictureLabel: "Make 2 pictures about simple machines",
  },
  {
    id: "human-body",
    title: "My body systems",
    topic: "how the human body works",
    asks: [
      {
        label: "Explain what bones do in What I learned",
        clues: ["support", "shape", "protect", "skeleton", "stand"],
        prompt: "Help me explain bones for my notes.",
      },
      {
        label: "Explain what the heart does in What I learned",
        clues: ["blood", "pump", "body"],
        prompt: "Help me explain the heart for my notes.",
      },
      {
        label: "Add about how many bones an adult has to What I learned",
        clues: ["206"],
        prompt: "I need the adult bone-count fact for my project.",
      },
    ],
    write: {
      label: "Write in your own words about muscles",
      clues: ["muscle"],
      prompt: "Tell me about muscles so I can rewrite it.",
    },
    hints: ["A friendly diagram of a beating heart", "Strong arm muscles helping lift a book"],
    pictureLabel: "Make 2 pictures about the human body",
  },
  {
    id: "five-senses",
    title: "Five senses",
    topic: "the five senses",
    asks: [
      {
        label: "Explain how we see in What I learned",
        clues: ["light", "eye", "brain"],
        prompt: "Help me explain sight for my notes.",
      },
      {
        label: "Explain how we hear in What I learned",
        clues: ["vibrat", "sound", "ear", "wave"],
        prompt: "Help me explain hearing for my notes.",
      },
      {
        label: "List all five senses in What I learned",
        clues: ["sight", "smell", "touch", "taste", "hearing"],
        requireAllClues: true,
        prompt: "Help me make sure I know all five senses for my notes.",
      },
    ],
    write: {
      label: "Write in your own words about taste",
      clues: ["taste", "tongue"],
      prompt: "Tell me about taste so I can put it in my own words.",
    },
    hints: ["A child smelling a flower", "Colorful foods on a plate for tasting"],
    pictureLabel: "Make 2 pictures about the senses",
  },
  {
    id: "maps-compass",
    title: "Maps and compass",
    topic: "maps and compasses",
    asks: [
      {
        label: "Explain what a compass is for in What I learned",
        clues: ["north", "direction", "needle"],
        prompt: "Help me explain compasses for my notes.",
      },
      {
        label: "Explain what a map key does in What I learned",
        clues: ["symbol", "mean", "picture", "legend"],
        prompt: "Help me explain map keys for my notes.",
      },
      {
        label: "List N, S, E, and W in What I learned",
        clues: ["north", "south", "east", "west"],
        requireAllClues: true,
        prompt: "Help me lock in the four directions for my notes.",
      },
    ],
    write: {
      label: "Write in your own words about directions",
      clues: ["north", "south", "east", "west", "direction"],
      prompt: "Tell me about map directions so I can rewrite them.",
    },
    hints: ["A compass pointing north", "A simple colorful map of a park"],
    pictureLabel: "Make 2 pictures about maps",
  },
  {
    id: "community-helpers",
    title: "Community helpers",
    topic: "people who help in a community",
    asks: [
      {
        label: "Explain how firefighters help in What I learned",
        clues: ["fire", "safe", "rescue", "emergency"],
        prompt: "Help me explain firefighters for my notes.",
      },
      {
        label: "Explain how doctors help in What I learned",
        clues: ["sick", "health", "medicine", "care", "hurt"],
        prompt: "Help me explain doctors for my notes.",
      },
      {
        label: "Add one way librarians help to What I learned",
        clues: ["book", "read", "learn", "library"],
        prompt: "How do librarians help? I need a fact for notes.",
      },
    ],
    write: {
      label: "Write in your own words about teachers",
      clues: ["teacher"],
      prompt: "Tell me about teachers so I can write it myself.",
    },
    hints: ["A friendly firefighter by a red truck", "A teacher reading with kids in a classroom"],
    pictureLabel: "Make 2 pictures about community helpers",
  },
  {
    id: "recycling",
    title: "Reduce, reuse, recycle",
    topic: "recycling and taking care of Earth",
    asks: [
      {
        label: "Explain recycling in What I learned",
        clues: ["new", "again", "material", "plastic", "paper"],
        prompt: "Help me explain recycling for my notes.",
      },
      {
        label: "Explain reusing with one example in What I learned",
        clues: ["again", "bag", "jar", "bottle", "use"],
        prompt: "Give me reuse examples I can rewrite.",
      },
      {
        label: "Compare reduce, reuse, and recycle in What I learned",
        clues: ["less", "again", "new", "waste"],
        prompt: "Help me compare reduce, reuse, and recycle.",
      },
    ],
    write: {
      label: "Write in your own words about reducing waste",
      clues: ["reduce", "waste"],
      prompt: "Tell me about reducing waste so I can put it in my own words.",
    },
    hints: ["Sorting paper, plastic, and glass into bins", "Kids planting a tree near a clean park"],
    pictureLabel: "Make 2 pictures about recycling",
  },
  {
    id: "solar-system",
    title: "Our solar system",
    topic: "the solar system",
    asks: [
      {
        label: "Explain what orbits the Sun in What I learned",
        clues: ["planet", "orbit", "around"],
        prompt: "Help me explain orbits for my notes.",
      },
      {
        label: "Name the closest planet to the Sun in What I learned",
        clues: ["mercury"],
        prompt: "Which planet is closest to the Sun? I need that for notes.",
      },
      {
        label: "Say how many planets there are in What I learned",
        clues: ["eight", "8"],
        prompt: "How many planets are there? I need the number for notes.",
      },
    ],
    write: {
      label: "Write in your own words about Earth",
      clues: ["earth"],
      prompt: "Tell me about Earth so I can rewrite it.",
    },
    hints: ["Planets lined up around a bright Sun", "Blue Earth with white clouds in space"],
    pictureLabel: "Make 2 pictures about the solar system",
  },
  {
    id: "birds",
    title: "Birds",
    topic: "birds",
    asks: [
      {
        label: "Explain why feathers help birds in What I learned",
        clues: ["fly", "warm", "heat", "wing", "insulat"],
        prompt: "Help me explain feathers for my notes.",
      },
      {
        label: "Explain how wings help birds fly in What I learned",
        clues: ["air", "lift", "flap", "wing"],
        prompt: "Help me explain bird flight for my notes.",
      },
      {
        label: "Find the fastest bird and its speed — add both to What I learned",
        clues: ["peregrine", "falcon", "mph", "km", "hour"],
        prompt: "I want to research the fastest bird for my notes.",
      },
    ],
    write: {
      label: "Write in your own words about owls",
      clues: ["owl"],
      prompt: "Tell me about owls so I can write it in my own words.",
    },
    hints: ["A bright bird flying over trees", "An owl perched on a branch at dusk"],
    pictureLabel: "Make 2 pictures about birds",
  },
  {
    id: "farm-life",
    title: "Life on a farm",
    topic: "farms and farm animals",
    asks: [
      {
        label: "Explain what crops are with an example in What I learned",
        clues: ["wheat", "corn", "rice", "vegetable", "fruit", "grow"],
        prompt: "Help me explain crops with an example for notes.",
      },
      {
        label: "Explain one way farmers care for animals in What I learned",
        clues: ["food", "water", "shelter", "barn", "care"],
        prompt: "How do farmers care for animals? I need a note-ready answer.",
      },
      {
        label: "Name one food from a farm animal in What I learned",
        clues: ["milk", "egg", "wool", "cheese"],
        prompt: "What foods come from farm animals? I need one for notes.",
      },
    ],
    write: {
      label: "Write in your own words about cows",
      clues: ["cow"],
      prompt: "Tell me about cows so I can rewrite it.",
    },
    hints: ["A sunny farm with a red barn", "Cows grazing in a green field"],
    pictureLabel: "Make 2 pictures about farm life",
  },
  {
    id: "arctic-animals",
    title: "Arctic animals",
    topic: "animals that live in the Arctic",
    asks: [
      {
        label: "Explain how polar bears stay warm in What I learned",
        clues: ["fur", "fat", "blubber", "thick"],
        prompt: "Help me explain polar bear warmth for notes.",
      },
      {
        label: "Say what penguins eat in What I learned",
        clues: ["fish", "krill", "squid"],
        prompt: "What do penguins eat? I need that for notes.",
      },
      {
        label: "Compare the Arctic and Antarctica in What I learned",
        clues: ["north", "south", "bear", "penguin", "pole"],
        prompt: "Help me compare the Arctic and Antarctica.",
      },
    ],
    write: {
      label: "Write in your own words about seals",
      clues: ["seal"],
      prompt: "Tell me about seals so I can put it in my own words.",
    },
    hints: ["A polar bear on bright white ice", "Penguins sliding on snow near the sea"],
    pictureLabel: "Make 2 pictures about Arctic animals",
  },
  {
    id: "deserts",
    title: "Desert life",
    topic: "deserts",
    asks: [
      {
        label: "Explain why deserts are dry in What I learned",
        clues: ["rain", "little", "dry", "water"],
        prompt: "Help me explain dry deserts for my notes.",
      },
      {
        label: "Explain how cacti store water in What I learned",
        clues: ["stem", "store", "water", "thick"],
        prompt: "Help me explain cactus water storage for notes.",
      },
      {
        label: "Name a very hot desert in What I learned",
        clues: ["sahara", "death valley", "atacama", "sonoran"],
        prompt: "Help me find a famous hot desert for my notes.",
      },
    ],
    write: {
      label: "Write in your own words about camels",
      clues: ["camel"],
      prompt: "Tell me about camels so I can rewrite it.",
    },
    hints: ["A tall cactus under a hot sun", "A camel walking across sandy dunes"],
    pictureLabel: "Make 2 pictures about deserts",
  },
  {
    id: "rivers",
    title: "Rivers",
    topic: "rivers",
    asks: [
      {
        label: "Explain where rivers begin in What I learned",
        clues: ["hill", "mountain", "source", "spring", "melt"],
        prompt: "Help me explain where rivers start for notes.",
      },
      {
        label: "Explain where rivers end in What I learned",
        clues: ["ocean", "sea", "mouth", "lake"],
        prompt: "Help me explain where rivers end for notes.",
      },
      {
        label: "Name a very long river in What I learned",
        clues: ["nile", "amazon", "yangtze", "mississippi"],
        prompt: "Help me pick a long river fact for my notes.",
      },
    ],
    write: {
      label: "Write in your own words about freshwater",
      clues: ["fresh", "water"],
      prompt: "Tell me about freshwater so I can write it myself.",
    },
    hints: ["A clear river flowing through green hills", "A waterfall pouring into a rocky pool"],
    pictureLabel: "Make 2 pictures about rivers",
  },
  {
    id: "light-shadow",
    title: "Light and shadows",
    topic: "light and shadows",
    asks: [
      {
        label: "Explain what makes a shadow in What I learned",
        clues: ["block", "light", "object", "behind"],
        prompt: "Help me explain shadows for my notes.",
      },
      {
        label: "Explain why shadow size changes in What I learned",
        clues: ["sun", "angle", "morning", "noon", "low", "high"],
        prompt: "Why do shadows change size? I need a note-ready answer.",
      },
      {
        label: "Compare natural and artificial light in What I learned",
        clues: ["sun", "lamp", "bulb", "made"],
        prompt: "Help me compare natural and artificial light.",
      },
    ],
    write: {
      label: "Write in your own words about sunlight",
      clues: ["sun", "light"],
      prompt: "Tell me about sunlight so I can rewrite it.",
    },
    hints: ["A child casting a long shadow at sunset", "Sunbeams through a window onto the floor"],
    pictureLabel: "Make 2 pictures about light and shadows",
  },
  {
    id: "sound",
    title: "Sound all around",
    topic: "sound",
    asks: [
      {
        label: "Explain how sound travels in What I learned",
        clues: ["vibrat", "wave", "air"],
        prompt: "Help me explain how sound travels for notes.",
      },
      {
        label: "Explain pitch with high and low in What I learned",
        clues: ["high", "low", "pitch"],
        prompt: "Help me explain pitch for my notes.",
      },
      {
        label: "Compare loud and soft sound in What I learned",
        clues: ["volume", "energy", "big", "small", "quiet"],
        prompt: "Help me compare loud and soft sounds.",
      },
    ],
    write: {
      label: "Write in your own words about loud and soft sounds",
      clues: ["loud", "soft", "volume"],
      prompt: "Tell me about loud and soft sounds so I can rewrite it.",
    },
    hints: ["Ripples of sound waves from a ringing bell", "Kids playing drums and shaking maracas"],
    pictureLabel: "Make 2 pictures about sound",
  },
  {
    id: "food-chains",
    title: "Food chains",
    topic: "food chains",
    asks: [
      {
        label: "Explain what a producer is in What I learned",
        clues: ["plant", "sun", "energy", "make"],
        prompt: "Help me explain producers for my notes.",
      },
      {
        label: "Explain what a consumer is in What I learned",
        clues: ["eat", "animal", "food"],
        prompt: "Help me explain consumers for my notes.",
      },
      {
        label: "Write a 3-step food chain in What I learned",
        clues: ["grass", "plant", "rabbit", "fox", "fish", "bird", "eats"],
        prompt: "Help me build a simple 3-step food chain for notes.",
      },
    ],
    write: {
      label: "Write in your own words about a simple food chain",
      clues: ["chain", "eats", "food"],
      prompt: "Tell me about food chains so I can write my own example.",
    },
    hints: ["Grass, a rabbit, and a fox in a sunny meadow", "A pond food chain with plants and fish"],
    pictureLabel: "Make 2 pictures about food chains",
  },
  {
    id: "seasons",
    title: "Four seasons",
    topic: "the four seasons",
    asks: [
      {
        label: "Explain why seasons happen in What I learned",
        clues: ["tilt", "earth", "sun"],
        prompt: "Help me explain seasons for my notes.",
      },
      {
        label: "Explain what happens to trees in autumn in What I learned",
        clues: ["leaf", "fall", "color", "drop"],
        prompt: "What happens in autumn to trees? I need a note-ready answer.",
      },
      {
        label: "List the four seasons in order in What I learned",
        clues: ["spring", "summer", "autumn|fall", "winter"],
        requireAllClues: true,
        prompt: "Help me list the seasons in order for my notes.",
      },
    ],
    write: {
      label: "Write in your own words about winter",
      clues: ["winter"],
      prompt: "Tell me about winter so I can rewrite it.",
    },
    hints: ["A tree with bright autumn leaves", "A snowy winter hillside with bare trees"],
    pictureLabel: "Make 2 pictures about the seasons",
  },
  {
    id: "bridges",
    title: "Bridges",
    topic: "bridges",
    asks: [
      {
        label: "Explain why people build bridges in What I learned",
        clues: ["cross", "river", "road", "connect"],
        prompt: "Help me explain why bridges exist for notes.",
      },
      {
        label: "Explain what a suspension bridge uses in What I learned",
        clues: ["cable", "tower", "hang"],
        prompt: "Help me explain suspension bridges for notes.",
      },
      {
        label: "Compare arch and beam bridges in What I learned",
        clues: ["arch", "beam", "curve", "straight"],
        prompt: "Help me compare arch and beam bridges.",
      },
    ],
    write: {
      label: "Write in your own words about strong shapes in bridges",
      clues: ["triangle", "arch", "strong"],
      prompt: "Tell me about strong bridge shapes so I can rewrite it.",
    },
    hints: ["A stone arch bridge over a blue river", "A tall suspension bridge with cables"],
    pictureLabel: "Make 2 pictures about bridges",
  },
];


export const STARTERS: ProjectTemplate[] = STARTER_DRAFTS.map(makeStarter);

export function starterProject(): Project {
  return { ...STARTERS[0], source: "starter", notice: null };
}

export function nextStarter(currentTitle: string): ProjectTemplate {
  const current = currentTitle.trim().toLowerCase();
  const index = STARTERS.findIndex((starter) => starter.title.toLowerCase() === current);
  if (index >= 0) {
    return STARTERS[(index + 1) % STARTERS.length];
  }
  return STARTERS.find((starter) => starter.title.toLowerCase() !== current) ?? STARTERS[0];
}

export function instanceFromStarter(
  starter: ProjectTemplate,
  notice: string | null,
): Project {
  return {
    ...starter,
    id: crypto.randomUUID(),
    source: "starter",
    notice,
  };
}
